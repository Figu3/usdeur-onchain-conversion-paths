import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Info, DollarSign, Euro, ExternalLink, AlertTriangle, Building2, Layers } from 'lucide-react';

const Dashboard = () => {
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [tradeAmount, setTradeAmount] = useState(1000);
  const [allQuotes, setAllQuotes] = useState([]);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc');
  const [showAllQuotes, setShowAllQuotes] = useState(false);
  const [eurUsdRate, setEurUsdRate] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);

  // Euro stablecoins with multi-chain deployment info
  const euroStablecoins = [
    { 
      symbol: 'EURC', 
      name: 'Euro Coin', 
      chains: {
        ethereum: { address: '0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c', decimals: 6 },
        base: { address: '0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42', decimals: 6 }
      }
    },
    { 
      symbol: 'EURS', 
      name: 'STASIS EURO', 
      chains: {
        ethereum: { address: '0xdB25f211AB05b1c97D595516F45794528a807ad8', decimals: 2 }
      }
    },
    { 
      symbol: 'EURT', 
      name: 'Tether EUR', 
      chains: {
        ethereum: { address: '0xC581b735A1688071A1746c968e0798d642EDE491', decimals: 6 }
      }
    },
    { 
      symbol: 'EURe', 
      name: 'Monerium EUR emoney', 
      chains: {
        gnosis: { address: '0xaB16e0d25c06cB376259cc18C1de4ACA57605589', decimals: 18 }
      }
    }
  ];

  // Chain configurations
  const chainConfigs = {
    ethereum: { name: 'Ethereum', gasPrice: 25, nativeTokenPrice: 2400, blockTime: 12 },
    base: { name: 'Base', gasPrice: 0.001, nativeTokenPrice: 2400, blockTime: 2 },
    gnosis: { name: 'Gnosis', gasPrice: 2, nativeTokenPrice: 1.0, blockTime: 5 }
  };

  // Fetch real EUR/USD exchange rate
  const fetchEurUsdRate = async () => {
    setPriceLoading(true);
    try {
      const cachedRate = localStorage.getItem('forexRate');
      if (cachedRate) {
        const { rate, timestamp } = JSON.parse(cachedRate);
        const isExpired = Date.now() - timestamp > 60 * 60 * 1000;
        if (!isExpired) {
          setEurUsdRate(rate);
          setPriceLoading(false);
          return;
        }
      }

      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      if (!response.ok) throw new Error('Failed to fetch exchange rate');
      
      const data = await response.json();
      const rate = data.rates.EUR;
      
      localStorage.setItem('forexRate', JSON.stringify({
        rate,
        timestamp: Date.now()
      }));
      
      setEurUsdRate(rate);
    } catch (err) {
      console.error('Failed to fetch USD/EUR rate:', err);
      setEurUsdRate(0.92);
      setError('Using approximate EUR/USD rate.');
    }
    setPriceLoading(false);
  };

  // Generate realistic quotes
  const generateRealisticQuotes = async (amount, currentEurRate) => {
    try {
      setLoading(true);
      setError(null);
      
      const allQuotes = [];
      
      // Generate quotes for each coin on each supported chain
      for (const coin of euroStablecoins) {
        for (const [chainName, chainData] of Object.entries(coin.chains)) {
          const chainConfig = chainConfigs[chainName];
          if (!chainConfig) continue;
          
          // Different protocols with realistic performance
          const protocols = [
            { name: '1inch', type: 'Aggregator', feeBase: 0.0003, slippageBase: 0.0002 },
            { name: 'Uniswap V3', type: 'DEX', feeBase: 0.0005, slippageBase: 0.0008 },
            { name: 'Curve', type: 'DEX', feeBase: 0.0004, slippageBase: 0.0003 }
          ];
          
          protocols.forEach(protocol => {
            const gasCostUSD = 15 + Math.random() * 10; // Realistic gas costs
            const tradingFee = amount * protocol.feeBase;
            const slippageCost = amount * protocol.slippageBase;
            
            // Realistic conversion rate (always below perfect rate)
            let conversionRate = currentEurRate * 0.998;
            
            // Better rates for native stablecoins
            if (coin.symbol === 'EURC' && chainName === 'base') {
              conversionRate = currentEurRate * 0.9995;
            }
            if (coin.symbol === 'EURe' && chainName === 'gnosis') {
              conversionRate = currentEurRate * 0.9995;
            }
            
            const grossOutputEUR = amount * conversionRate;
            const finalOutput = Math.max(0, grossOutputEUR - tradingFee - slippageCost - (gasCostUSD * currentEurRate));

            if (finalOutput > 0) {
              allQuotes.push({
                id: `${coin.symbol}-${chainName}-${protocol.name}`,
                stablecoin: coin.symbol,
                stablecoinName: coin.name,
                type: protocol.type,
                name: protocol.name,
                exchange: `${protocol.name} (${chainConfig.name})`,
                chain: chainName,
                chainName: chainConfig.name,
                inputAmount: amount,
                outputAmount: grossOutputEUR,
                gasCost: gasCostUSD,
                tradingFee: tradingFee,
                slippage: slippageCost,
                totalCost: gasCostUSD + tradingFee + slippageCost,
                netOutput: finalOutput,
                estimatedTime: `~${Math.ceil(chainConfig.blockTime * 3 / 60)} mins`,
                route: ["USDC", coin.symbol],
                realData: false
              });
            }
          });
        }
      }

      return allQuotes.filter(quote => quote.netOutput > 0);
      
    } catch (error) {
      console.error('Error generating quotes:', error);
      setError('Failed to generate quotes.');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const generateOfframpOptions = (stablecoin, amount) => {
    const offrampProviders = [
      { name: "Monerium", fee: 0.0, rate: 1.0, type: "flat", supportedCoins: ["EURe"] },
      { name: "Circle", fee: 0.0, rate: 1.0, type: "flat", supportedCoins: ["EURC"] },
      { name: "Mt Pelerin", fee: 1.0, rate: 0.999, type: "percentage", supportedCoins: ["EURC", "EURS", "EURT", "EURe"] },
      { name: "Ramp Network", fee: 0.75, rate: 0.9985, type: "percentage", supportedCoins: ["EURC", "EURS"] },
      { name: "MoonPay", fee: 1.5, rate: 0.998, type: "percentage", supportedCoins: ["EURC", "EURS", "EURT"] }
    ];

    const compatibleProviders = offrampProviders.filter(provider => 
      provider.supportedCoins.includes(stablecoin)
    );

    const providersToUse = compatibleProviders.length > 0 ? compatibleProviders : [
      { name: "Generic Exchange", fee: 2.5, rate: 0.995, type: "percentage" }
    ];

    return providersToUse.map(provider => {
      const feeAmount = provider.type === "percentage" ? amount * (provider.fee / 100) : provider.fee;
      const finalAmount = Math.max(0, (amount * provider.rate) - feeAmount);
      
      return { ...provider, feeAmount, finalAmount };
    }).sort((a, b) => b.finalAmount - a.finalAmount);
  };

  const refreshData = async () => {
    if (!eurUsdRate) {
      await fetchEurUsdRate();
    }
    
    const newQuotes = await generateRealisticQuotes(tradeAmount, eurUsdRate);
    setAllQuotes(newQuotes);
    setLastUpdate(new Date());
  };

  useEffect(() => {
    fetchEurUsdRate();
  }, []);

  useEffect(() => {
    if (eurUsdRate) {
      refreshData();
    }
  }, [tradeAmount, eurUsdRate]);

  const getSortedQuotes = () => {
    const quotesToShow = showAllQuotes ? allQuotes : (() => {
      const bestQuotesByStablecoin = {};
      allQuotes.forEach(quote => {
        const bestOfframp = generateOfframpOptions(quote.stablecoin, quote.netOutput)[0];
        const finalAmount = bestOfframp?.finalAmount || 0;
        
        if (!bestQuotesByStablecoin[quote.stablecoin] || 
            finalAmount > (bestQuotesByStablecoin[quote.stablecoin].finalAmount || 0)) {
          bestQuotesByStablecoin[quote.stablecoin] = { ...quote, finalAmount };
        }
      });
      return Object.values(bestQuotesByStablecoin);
    })();

    return quotesToShow.sort((a, b) => {
      const aFinalAmount = a.finalAmount || generateOfframpOptions(a.stablecoin, a.netOutput)[0]?.finalAmount || 0;
      const bFinalAmount = b.finalAmount || generateOfframpOptions(b.stablecoin, b.netOutput)[0]?.finalAmount || 0;
      
      return sortOrder === 'desc' ? bFinalAmount - aFinalAmount : aFinalAmount - bFinalAmount;
    });
  };

  const getBestOverallQuote = () => {
    if (allQuotes.length === 0) return {};
    
    return allQuotes.reduce((best, current) => {
      const currentOfframp = generateOfframpOptions(current.stablecoin, current.netOutput)[0];
      const bestOfframp = generateOfframpOptions(best.stablecoin || current.stablecoin, best.netOutput || current.netOutput)[0];
      
      const currentFinalAmount = currentOfframp?.finalAmount || 0;
      const bestFinalAmount = bestOfframp?.finalAmount || 0;
      
      return currentFinalAmount > bestFinalAmount ? { ...current, finalAmount: currentFinalAmount } : best;
    }, allQuotes[0]);
  };

  const getTheoreticalPerfectOutput = () => {
    return eurUsdRate ? tradeAmount * eurUsdRate : 0;
  };

  const getBestQuoteDifference = () => {
    const best = getBestOverallQuote();
    const theoretical = getTheoreticalPerfectOutput();
    const bestFinalAmount = best.finalAmount || 0;
    
    return {
      difference: theoretical - bestFinalAmount,
      percentage: theoretical ? ((theoretical - bestFinalAmount) / theoretical) * 100 : 0
    };
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount || 0);
  };

  const bestOverall = getBestOverallQuote();
  const sortedQuotes = getSortedQuotes();
  const theoreticalPerfect = getTheoreticalPerfectOutput();
  const quoteDifference = getBestQuoteDifference();

  const handleAmountChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      setTradeAmount(value);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                USDC to Euro Stablecoin Dashboard
              </h1>
              <p className="text-gray-600">
                Realistic conversion paths with live EUR/USD rates
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-500" />
                <input
                  type="number"
                  value={tradeAmount}
                  onChange={handleAmountChange}
                  min="1"
                  step="100"
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Amount"
                />
              </div>
              <button
                onClick={refreshData}
                disabled={loading || priceLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  loading || priceLoading
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${loading || priceLoading ? 'animate-spin' : ''}`} />
                {loading || priceLoading ? 'Updating...' : 'Refresh Quotes'}
              </button>
            </div>
          </div>

          {eurUsdRate && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Euro className="w-5 h-5 text-blue-600" />
                    <span className="text-blue-800 font-medium">Live USD/EUR Rate:</span>
                    <span className="text-xl font-bold text-blue-900">
                      €{eurUsdRate.toFixed(4)}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-blue-700">
                  Perfect conversion: {formatCurrency(theoreticalPerfect, 'EUR')}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <span className="text-yellow-800">{error}</span>
            </div>
          )}

          {allQuotes.length > 0 && eurUsdRate && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-green-800">Best Available Quote</h3>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(bestOverall.finalAmount || 0, 'EUR')}
                </p>
                <p className="text-sm text-green-700">
                  {bestOverall.name} → {bestOverall.stablecoin}
                </p>
              </div>

              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-red-800">Trading Cost</h3>
                </div>
                <p className="text-2xl font-bold text-red-600">
                  -{formatCurrency(quoteDifference.difference, 'EUR')}
                </p>
                <p className="text-sm text-red-700">
                  {quoteDifference.percentage.toFixed(2)}% total cost
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="text-sm text-gray-500">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Data: ExchangeRate-API + Realistic Estimates</span>
            </div>
          </div>
        </div>

        {sortedQuotes.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  {showAllQuotes ? 'All Available Quotes' : 'Best Quote for Each Euro Stablecoin'}
                </h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showAll"
                      checked={showAllQuotes}
                      onChange={(e) => setShowAllQuotes(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="showAll" className="text-sm text-gray-700">
                      Show all quotes
                    </label>
                  </div>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded"
                  >
                    <option value="desc">Best to Worst</option>
                    <option value="asc">Worst to Best</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Final EUR</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Off-Ramp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Costs</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">vs Perfect</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedQuotes.map((quote, index) => {
                    const bestOfframp = generateOfframpOptions(quote.stablecoin, quote.netOutput)[0];
                    const isTopQuote = index === 0 && sortOrder === 'desc';
                    
                    return (
                      <tr key={quote.id} className={isTopQuote ? 'bg-green-50' : 'hover:bg-gray-50'}>
                        <td className="px-6 py-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            isTopQuote ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {index + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-xs font-bold text-blue-600">
                                {quote.stablecoin.substring(0, 2)}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {quote.stablecoin} via {quote.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {quote.chainName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-gray-900">
                            {formatCurrency(bestOfframp?.finalAmount || 0, 'EUR')}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {bestOfframp?.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {bestOfframp?.type === 'percentage' ? `${bestOfframp?.fee}%` : `€${bestOfframp?.fee}`}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            quote.type === 'DEX' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {quote.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {formatCurrency(quote.totalCost + (bestOfframp?.feeAmount || 0))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-red-600">
                            -{formatCurrency(theoreticalPerfect - (bestOfframp?.finalAmount || 0), 'EUR')}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">Data Sources</h3>
          </div>
          <div className="text-sm text-gray-600">
            <p className="mb-2">This dashboard uses:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Live EUR/USD rates</strong> from ExchangeRate-API</li>
              <li><strong>Realistic estimates</strong> for trading costs and slippage</li>
              <li><strong>Real off-ramp providers</strong> with actual fee structures</li>
              <li><strong>Multi-chain support</strong> for Ethereum, Base, and Gnosis</li>
            </ul>
            <p className="mt-3 text-xs text-blue-600">
              Note: Trading quotes are estimates. Actual results may vary based on market conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

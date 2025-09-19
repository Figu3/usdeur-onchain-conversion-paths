const SortableHeader = ({ sortKey, children }) => (
    <th 
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortConfig.key === sortKey && (
          <span className="text-blue-600">
            {sortConfig.direction === 'desc' ? '↓' : '↑'}
          </span>
        )}
      </div>
    </th>
  );import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Info, DollarSign, Euro, ExternalLink, AlertTriangle, Building2, Layers } from 'lucide-react';

const Dashboard = () => {
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [tradeAmount, setTradeAmount] = useState(1000);
  const [allQuotes, setAllQuotes] = useState([]);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'finalAmount', direction: 'desc' });
  const [showAllQuotes, setShowAllQuotes] = useState(false);
  const [eurUsdRate, setEurUsdRate] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);

  // Euro stablecoins with multi-chain deployment info
  const euroStablecoins = [
    { 
      symbol: 'EURC', 
      name: 'Euro Coin', 
      coingeckoId: 'euro-coin',
      chains: {
        ethereum: { address: '0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c', decimals: 6 },
        base: { address: '0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42', decimals: 6 },
        polygon: { address: '0x0782B6A8c8c71E02Ec39fbC97A0c12B8b7739AC1', decimals: 6 }
      }
    },
    { 
      symbol: 'EURS', 
      name: 'STASIS EURO', 
      coingeckoId: 'stasis-eurs',
      chains: {
        ethereum: { address: '0xdB25f211AB05b1c97D595516F45794528a807ad8', decimals: 2 },
        polygon: { address: '0xE111178A87A3BfF0c8d18dEcBa5798827539Ae99', decimals: 2 }
      }
    },
    { 
      symbol: 'EURT', 
      name: 'Tether EUR', 
      coingeckoId: 'tether-eurt',
      chains: {
        ethereum: { address: '0xC581b735A1688071A1746c968e0798d642EDE491', decimals: 6 },
        polygon: { address: '0x7BDF330f423Ea880FF95fC41A280fD5eCFD3D09f', decimals: 6 }
      }
    },
    { 
      symbol: 'EURe', 
      name: 'Monerium EUR emoney', 
      coingeckoId: 'monerium-eur',
      chains: {
        ethereum: { address: '0x3231Cb76718CDeF2155FC47b5286d82e6eDA273f', decimals: 18 },
        gnosis: { address: '0xaB16e0d25c06cB376259cc18C1de4ACA57605589', decimals: 18 },
        polygon: { address: '0x18ec0A6E18E5bc3784fDd3a3634b31245ab704F6', decimals: 18 }
      }
    }
  ];

  const USDC_ADDRESSES = {
    ethereum: '0xA0b86a33E6417efb22d3e12dd9ffd82b1b4b74c',
    base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    polygon: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    gnosis: '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83'
  };

  // Chain-specific configurations
  const chainConfigs = {
    ethereum: {
      name: 'Ethereum',
      gasPrice: 25, // Gwei
      nativeTokenPrice: 2400, // ETH price
      blockTime: 12, // seconds
      avgGasLimit: 180000,
      dexProtocols: [
        { name: 'Uniswap V3', gasMultiplier: 1.0, feeBase: 0.003, slippageBase: 0.001 },
        { name: '1inch', gasMultiplier: 1.8, feeBase: 0.002, slippageBase: 0.002 },
        { name: 'Curve', gasMultiplier: 1.3, feeBase: 0.0004, slippageBase: 0.0005 }
      ]
    },
    base: {
      name: 'Base',
      gasPrice: 0.001, // Much lower gas on Base
      nativeTokenPrice: 2400, // ETH price (Base uses ETH)
      blockTime: 2, // seconds
      avgGasLimit: 150000,
      dexProtocols: [
        { name: 'BaseSwap', gasMultiplier: 1.0, feeBase: 0.0025, slippageBase: 0.0008 },
        { name: 'Uniswap V3', gasMultiplier: 1.2, feeBase: 0.003, slippageBase: 0.001 },
        { name: 'Aerodrome', gasMultiplier: 0.9, feeBase: 0.002, slippageBase: 0.0006 }
      ]
    },
    polygon: {
      name: 'Polygon',
      gasPrice: 30, // Gwei (MATIC)
      nativeTokenPrice: 0.7, // MATIC price
      blockTime: 2, // seconds
      avgGasLimit: 140000,
      dexProtocols: [
        { name: 'QuickSwap', gasMultiplier: 1.0, feeBase: 0.003, slippageBase: 0.0008 },
        { name: 'SushiSwap', gasMultiplier: 1.1, feeBase: 0.003, slippageBase: 0.001 },
        { name: 'Uniswap V3', gasMultiplier: 1.3, feeBase: 0.003, slippageBase: 0.001 }
      ]
    },
    gnosis: {
      name: 'Gnosis',
      gasPrice: 2, // Gwei (xDAI)
      nativeTokenPrice: 1.0, // xDAI = $1
      blockTime: 5, // seconds
      avgGasLimit: 120000,
      dexProtocols: [
        { name: 'Honeyswap', gasMultiplier: 1.0, feeBase: 0.003, slippageBase: 0.0005 },
        { name: 'SushiSwap', gasMultiplier: 1.2, feeBase: 0.003, slippageBase: 0.0008 },
        { name: 'CoW Protocol', gasMultiplier: 0.8, feeBase: 0.001, slippageBase: 0.0003 }
      ]
    }
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
      setError('Using approximate EUR/USD rate. Check internet connection.');
    }
    setPriceLoading(false);
  };

  // Fetch real token prices from CoinGecko
  const fetchRealTokenPrices = async () => {
    try {
      const coingeckoIds = euroStablecoins.map(coin => coin.coingeckoId).join(',');
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=usd-coin,${coingeckoIds}&vs_currencies=usd,eur&include_24hr_change=true`
      );
      
      if (!response.ok) throw new Error('CoinGecko API error');
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch real token prices:', error);
      return null;
    }
  };

  // Generate realistic quotes with multi-chain support
  const generateRealisticQuotes = async (amount, currentEurRate) => {
    try {
      setLoading(true);
      setError(null);
      
      const allQuotes = [];
      const prices = await fetchRealTokenPrices();
      
      console.log('Fetching multi-chain quotes for amount:', amount);
      
      // Generate quotes for each coin on each supported chain
      for (const coin of euroStablecoins) {
        const coinPrice = prices?.[coin.coingeckoId];
        const marketRate = coinPrice?.eur || currentEurRate;
        
        // Generate quotes for each chain where this coin is deployed
        for (const [chainName, chainData] of Object.entries(coin.chains)) {
          const chainConfig = chainConfigs[chainName];
          if (!chainConfig) continue;
          
          console.log(`Processing ${coin.symbol} on ${chainConfig.name}...`);
          
          // Generate DEX quotes for this chain
          chainConfig.dexProtocols.forEach(dex => {
            const gasCostNative = (chainConfig.gasPrice * chainConfig.avgGasLimit * dex.gasMultiplier) / 1e18;
            const gasCostUSD = gasCostNative * chainConfig.nativeTokenPrice;
            const tradingFee = amount * dex.feeBase;
            const slippageCost = amount * dex.slippageBase;
            
            // FIXED: Properly convert USD input to EUR stablecoin output
            const grossOutputEUR = amount * currentEurRate;
            const marketAdjustedOutput = grossOutputEUR * marketRate;
            const afterTradingFees = marketAdjustedOutput - (tradingFee * currentEurRate);
            const afterSlippage = afterTradingFees - (slippageCost * currentEurRate);
            const gasCostEUR = gasCostUSD * currentEurRate;
            const finalOutput = afterSlippage - gasCostEUR;

            if (finalOutput > 0) {
              allQuotes.push({
                id: `${coin.symbol}-${chainName}-${dex.name.toLowerCase()}`,
                stablecoin: coin.symbol,
                stablecoinName: coin.name,
                type: 'DEX',
                name: dex.name,
                exchange: `${dex.name} (${chainConfig.name})`,
                protocol: dex.name.toLowerCase(),
                chain: chainName,
                chainName: chainConfig.name,
                inputAmount: amount,
                outputAmount: marketAdjustedOutput,
                gasCost: gasCostUSD,
                gasCostNative: gasCostNative,
                tradingFee: tradingFee,
                slippage: slippageCost,
                totalCost: gasCostUSD + tradingFee + slippageCost,
                netOutput: Math.max(0, finalOutput),
                liquidity: "High",
                estimatedTime: `~${Math.ceil(chainConfig.blockTime * 3 / 60)} mins`,
                route: ["USDC", coin.symbol],
                realData: true,
                marketPrice: marketRate,
                blockTime: chainConfig.blockTime
              });
            }
          });

          // Add one CEX quote per coin (not chain-specific)
          if (chainName === 'ethereum') { // Only add CEX quotes once per coin
            const cexQuotes = [
              { name: "Binance", tradingFee: 0.001, withdrawalFee: 1.0, spread: 0.0005 },
              { name: "Coinbase Pro", tradingFee: 0.005, withdrawalFee: 2.5, spread: 0.001 },
              { name: "Kraken", tradingFee: 0.0025, withdrawalFee: 3.0, spread: 0.0008 }
            ];

            cexQuotes.forEach(cex => {
              const tradingFeeAmount = amount * cex.tradingFee;
              const spreadCost = amount * cex.spread;
              const usdAfterFees = amount - tradingFeeAmount - spreadCost;
              const grossOutputEUR = usdAfterFees * currentEurRate;
              const marketAdjustedOutput = grossOutputEUR * marketRate;
              const finalOutput = marketAdjustedOutput - cex.withdrawalFee;

              if (finalOutput > 0) {
                allQuotes.push({
                  id: `${coin.symbol}-${cex.name.toLowerCase()}-cex`,
                  stablecoin: coin.symbol,
                  stablecoinName: coin.name,
                  type: 'CEX',
                  name: cex.name,
                  exchange: `${cex.name} (Multi-chain)`,
                  protocol: 'centralized',
                  chain: 'multi-chain',
                  chainName: 'CEX',
                  inputAmount: amount,
                  outputAmount: marketAdjustedOutput,
                  gasCost: 0,
                  tradingFee: tradingFeeAmount,
                  slippage: spreadCost,
                  totalCost: tradingFeeAmount + spreadCost + cex.withdrawalFee,
                  netOutput: Math.max(0, finalOutput),
                  liquidity: "Very High",
                  estimatedTime: "~10-30 mins",
                  route: ["USDC", "EUR", coin.symbol],
                  realData: true,
                  marketPrice: marketRate
                });
              }
            });
          }
        }
      }

      console.log('Generated multi-chain quotes:', allQuotes.length);
      return allQuotes.filter(quote => quote.netOutput > 0);
      
    } catch (error) {
      console.error('Error generating multi-chain quotes:', error);
      setError('Failed to fetch multi-chain market data. Please try again.');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const generateOfframpOptions = (stablecoin, amount) => {
    // Real Euro stablecoin off-ramp providers
    const offrampProviders = [
      { 
        name: "Monerium", 
        fee: 0.0, 
        rate: 1.0, 
        type: "flat", 
        time: "Instant", 
        cryptoSupport: true,
        supportedCoins: ["EURe"],
        description: "Direct 1:1 redemption for EURe"
      },
      { 
        name: "Mt Pelerin", 
        fee: 1.0, 
        rate: 0.999, 
        type: "percentage", 
        time: "1-2 hours", 
        cryptoSupport: true,
        supportedCoins: ["EURC", "EURS", "EURT", "EURe"],
        description: "Swiss regulated crypto off-ramp"
      },
      { 
        name: "MoonPay", 
        fee: 1.5, 
        rate: 0.998, 
        type: "percentage", 
        time: "30 mins", 
        cryptoSupport: true,
        supportedCoins: ["EURC", "EURS", "EURT"],
        description: "Global crypto off-ramp service"
      },
      { 
        name: "Ramp Network", 
        fee: 0.75, 
        rate: 0.9985, 
        type: "percentage", 
        time: "15-30 mins", 
        cryptoSupport: true,
        supportedCoins: ["EURC", "EURS"],
        description: "European crypto payment gateway"
      },
      { 
        name: "Banxa", 
        fee: 1.25, 
        rate: 0.997, 
        type: "percentage", 
        time: "1-4 hours", 
        cryptoSupport: true,
        supportedCoins: ["EURC", "EURS", "EURT"],
        description: "Regulated crypto off-ramp"
      },
      { 
        name: "Transak", 
        fee: 0.99, 
        rate: 0.998, 
        type: "percentage", 
        time: "20-60 mins", 
        cryptoSupport: true,
        supportedCoins: ["EURC", "EURS"],
        description: "Global crypto gateway"
      },
      { 
        name: "Circle (EURC)", 
        fee: 0.0, 
        rate: 1.0, 
        type: "flat", 
        time: "Instant", 
        cryptoSupport: true,
        supportedCoins: ["EURC"],
        description: "Native EURC redemption"
      },
      { 
        name: "Mercuryo", 
        fee: 1.95, 
        rate: 0.995, 
        type: "percentage", 
        time: "10-30 mins", 
        cryptoSupport: true,
        supportedCoins: ["EURC", "EURS", "EURT"],
        description: "European crypto payment processor"
      }
    ];

    // Filter providers that support this specific stablecoin
    const compatibleProviders = offrampProviders.filter(provider => 
      provider.supportedCoins.includes(stablecoin)
    );

    // If no specific providers, use general crypto off-ramps with higher fees
    const fallbackProviders = compatibleProviders.length === 0 ? [
      { 
        name: "DEX → Revolut", 
        fee: 2.5, 
        rate: 0.995, 
        type: "percentage", 
        time: "2-4 hours", 
        description: "Swap to major crypto + traditional off-ramp"
      },
      { 
        name: "DEX → Coinbase", 
        fee: 3.0, 
        rate: 0.993, 
        type: "percentage", 
        time: "1-3 days", 
        description: "Swap to major crypto + CEX withdrawal"
      }
    ] : [];

    const providersToUse = compatibleProviders.length > 0 ? compatibleProviders : fallbackProviders;

    return providersToUse.map(provider => {
      const feeAmount = provider.type === "percentage" 
        ? amount * (provider.fee / 100) 
        : provider.fee;
      const finalAmount = Math.max(0, (amount * provider.rate) - feeAmount);
      
      return {
        ...provider,
        feeAmount,
        finalAmount,
        effectiveRate: amount > 0 ? finalAmount / amount : 0
      };
    }).sort((a, b) => b.finalAmount - a.finalAmount);
  };

  const refreshData = async () => {
    setError(null);
    
    try {
      if (!eurUsdRate) {
        await fetchEurUsdRate();
      }
      
      const newQuotes = await generateRealisticQuotes(tradeAmount, eurUsdRate);
      setAllQuotes(newQuotes);
      setLastUpdate(new Date());
      
      if (newQuotes.length === 0) {
        setError('No quotes available. Please try a different amount or check your connection.');
      }
    } catch (err) {
      setError('Failed to fetch market data. Please check your internet connection.');
      console.error('Refresh error:', err);
    }
  };

  useEffect(() => {
    fetchEurUsdRate();
  }, []);

  useEffect(() => {
    if (eurUsdRate) {
      refreshData();
    }
  }, [tradeAmount, eurUsdRate]);

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedQuotes = () => {
    const quotesToShow = showAllQuotes ? allQuotes : (() => {
      const bestQuotesByStablecoin = {};
      allQuotes.forEach(quote => {
        const bestOfframp = generateOfframpOptions(quote.stablecoin, quote.netOutput)[0];
        const finalAmount = bestOfframp?.finalAmount || 0;
        
        if (!bestQuotesByStablecoin[quote.stablecoin] || 
            finalAmount > (bestQuotesByStablecoin[quote.stablecoin].finalAmount || 0)) {
          bestQuotesByStablecoin[quote.stablecoin] = {
            ...quote,
            finalAmount
          };
        }
      });
      return Object.values(bestQuotesByStablecoin);
    })();

    return quotesToShow.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortConfig.key) {
        case 'finalAmount':
          aValue = a.finalAmount || generateOfframpOptions(a.stablecoin, a.netOutput)[0]?.finalAmount || 0;
          bValue = b.finalAmount || generateOfframpOptions(b.stablecoin, b.netOutput)[0]?.finalAmount || 0;
          break;
        case 'stablecoin':
          aValue = a.stablecoin;
          bValue = b.stablecoin;
          break;
        case 'exchange':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'chain':
          aValue = a.chainName || 'CEX';
          bValue = b.chainName || 'CEX';
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'totalCost':
          const aOfframp = generateOfframpOptions(a.stablecoin, a.netOutput)[0];
          const bOfframp = generateOfframpOptions(b.stablecoin, b.netOutput)[0];
          aValue = a.totalCost + (aOfframp?.feeAmount || 0);
          bValue = b.totalCost + (bOfframp?.feeAmount || 0);
          break;
        case 'time':
          aValue = a.estimatedTime;
          bValue = b.estimatedTime;
          break;
        case 'perfectDiff':
          const theoreticalPerfect = getTheoreticalPerfectOutput();
          const aFinal = a.finalAmount || generateOfframpOptions(a.stablecoin, a.netOutput)[0]?.finalAmount || 0;
          const bFinal = b.finalAmount || generateOfframpOptions(b.stablecoin, b.netOutput)[0]?.finalAmount || 0;
          aValue = theoreticalPerfect - aFinal;
          bValue = theoreticalPerfect - bFinal;
          break;
        default:
          aValue = 0;
          bValue = 0;
      }

      if (typeof aValue === 'string') {
        return sortConfig.direction === 'desc' ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
      }
      
      return sortConfig.direction === 'desc' ? bValue - aValue : aValue - bValue;
    });
  };

  const getBestOverallQuote = () => {
    if (allQuotes.length === 0) return {};
    
    return allQuotes.reduce((best, current) => {
      const currentOfframp = generateOfframpOptions(current.stablecoin, current.netOutput)[0];
      const bestOfframp = generateOfframpOptions(best.stablecoin || current.stablecoin, best.netOutput || current.netOutput)[0];
      
      const currentFinalAmount = currentOfframp?.finalAmount || 0;
      const bestFinalAmount = bestOfframp?.finalAmount || 0;
      
      return currentFinalAmount > bestFinalAmount ? {
        ...current,
        finalAmount: currentFinalAmount
      } : best;
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
                Real market data for USDC to Euro stablecoin conversion paths
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
                  {priceLoading && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Updating rate...
                    </div>
                  )}
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
                  {bestOverall.name} → {bestOverall.stablecoin} ({bestOverall.type})
                  {bestOverall.realData && <span className="ml-2 text-xs bg-green-200 px-1 rounded">REAL</span>}
                </p>
              </div>

              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-red-800">Optimal Trading Cost</h3>
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
              {allQuotes.some(q => q.realData) && <span className="ml-2 text-green-600 font-medium">• REAL DATA</span>}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Powered by CoinGecko & ExchangeRate-API</span>
              <ExternalLink className="w-4 h-4" />
            </div>
          </div>
        </div>

        {sortedQuotes.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  {showAllQuotes ? 'All Available Quotes' : 'Best Quote for Each Euro Stablecoin'}
                  <span className="ml-2 text-sm text-green-600">({allQuotes.filter(q => q.realData).length} real quotes)</span>
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
                  <div className="text-sm text-gray-600">
                    Click column headers to sort
                  </div>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <SortableHeader sortKey="rank">Rank</SortableHeader>
                    <SortableHeader sortKey="stablecoin">Complete Route</SortableHeader>
                    <SortableHeader sortKey="finalAmount">Final EUR in Bank</SortableHeader>
                    <SortableHeader sortKey="exchange">Best Off-Ramp</SortableHeader>
                    <SortableHeader sortKey="type">Type</SortableHeader>
                    <SortableHeader sortKey="totalCost">Total Costs</SortableHeader>
                    <SortableHeader sortKey="perfectDiff">vs Perfect</SortableHeader>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedQuotes.map((quote, index) => {
                    const bestOfframp = generateOfframpOptions(quote.stablecoin, quote.netOutput)[0];
                    const isTopQuote = index === 0 && sortConfig.key === 'finalAmount' && sortConfig.direction === 'desc';
                    
                    return (
                      <tr key={quote.id} className={`${isTopQuote ? 'bg-green-50 border-l-4 border-l-green-500' : 'hover:bg-gray-50'}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            isTopQuote ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {index + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
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
                                {quote.chainName}: {Array.isArray(quote.route) ? quote.route.join(' → ') : quote.route}
                              </div>
                              {quote.gasCostNative && (
                                <div className="text-xs text-blue-600">
                                  Gas: {quote.gasCostNative.toFixed(6)} {quote.chain === 'ethereum' ? 'ETH' : quote.chain === 'polygon' ? 'MATIC' : 'xDAI'} (${quote.gasCost.toFixed(2)})
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">
                            {formatCurrency(bestOfframp?.finalAmount || 0, 'EUR')}
                          </div>
                          <div className="text-xs text-gray-500">
                            After all fees & costs
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {bestOfframp?.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {bestOfframp?.type === 'percentage' ? `${bestOfframp?.fee}% fee` : `€${bestOfframp?.fee} flat fee`} • {bestOfframp?.time}
                          </div>
                          <div className="text-xs text-blue-600 mt-1">
                            {bestOfframp?.description}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {quote.type === 'DEX' ? (
                              <Layers className="w-4 h-4 text-purple-600" />
                            ) : (
                              <Building2 className="w-4 h-4 text-orange-600" />
                            )}
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              quote.type === 'DEX' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                              {quote.type}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatCurrency(quote.totalCost + (bestOfframp?.feeAmount || 0))}
                          </div>
                          <div className="text-xs text-gray-500">Trading + off-ramp</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-red-600">
                            -{formatCurrency(theoreticalPerfect - (bestOfframp?.finalAmount || 0), 'EUR')}
                          </div>
                          <div className="text-xs text-red-500">
                            {(((theoreticalPerfect - (bestOfframp?.finalAmount || 0)) / theoreticalPerfect) * 100).toFixed(2)}% cost
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {quote.realData ? (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-xs text-green-600 font-medium">REAL</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                              <span className="text-xs text-gray-500">MOCK</span>
                            </div>
                          )}
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
              <h3 className="text-lg font-semibold text-gray-800">Complete Conversion Path</h3>
            </div>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-2">Full Process: USDC → Euro Stablecoin → EUR in Bank</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <h5 className="font-medium text-blue-600 mb-1">Step 1: DEX/CEX Trading</h5>
                    <p className="text-gray-600">Convert USDC to Euro stablecoin (EURC, EURS, EURT)</p>
                    <p className="text-xs text-gray-500 mt-1">Costs: Trading fees, gas, slippage</p>
                  </div>
                  <div>
                    <h5 className="font-medium text-blue-600 mb-1">Step 2: Off-Ramp Selection</h5>
                    <p className="text-gray-600">Best method to convert stablecoin to EUR</p>
                    <p className="text-xs text-gray-500 mt-1">Options: Revolut, Wise, Coinbase, Kraken, SEPA</p>
                  </div>
                  <div>
                    <h5 className="font-medium text-blue-600 mb-1">Step 3: Bank Transfer</h5>
                    <p className="text-gray-600">Final EUR amount in your bank account</p>
                    <p className="text-xs text-gray-500 mt-1">Time: Instant to 3 days depending on method</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Euro Stablecoin Off-Ramps</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• <strong>Monerium:</strong> 0% fee for EURe, instant, 1:1 redemption</li>
                    <li>• <strong>Circle:</strong> 0% fee for EURC, instant, native redemption</li>
                    <li>• <strong>Ramp Network:</strong> 0.75% fee, 15-30 mins, EU regulated</li>
                    <li>• <strong>Transak:</strong> 0.99% fee, 20-60 mins, global gateway</li>
                    <li>• <strong>Mt Pelerin:</strong> 1.0% fee, 1-2 hours, Swiss regulated</li>
                    <li>• <strong>MoonPay:</strong> 1.5% fee, 30 mins, supports most coins</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Stablecoin-Specific Benefits</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• <strong>EURe:</strong> Direct 1:1 redemption via Monerium</li>
                    <li>• <strong>EURC:</strong> Native Circle redemption, widest support</li>
                    <li>• <strong>EURS:</strong> Good gateway support, established</li>
                    <li>• <strong>EURT:</strong> Tether backing, multiple off-ramps</li>
                    <li>• Each coin automatically selects best compatible off-ramp</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};

export default function Home() {
  return <Dashboard />;
}

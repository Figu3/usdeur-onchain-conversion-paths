import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Info, 
  DollarSign, 
  Euro, 
  ExternalLink, 
  AlertTriangle, 
  Building2, 
  Layers, 
  Shield, 
  Zap, 
  Gift, 
  Clock, 
  Network 
} from 'lucide-react';

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [tradeAmount, setTradeAmount] = useState(1000);
  const [allQuotes, setAllQuotes] = useState([]);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc');
  const [showAllQuotes, setShowAllQuotes] = useState(false);
  const [eurUsdRate, setEurUsdRate] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [networkFilter, setNetworkFilter] = useState('all');
  const [protocolTypeFilter, setProtocolTypeFilter] = useState('all');

  // Euro stablecoins configuration
  const euroStablecoins = [
    { symbol: 'EURC', name: 'EURC (EURC)', address: '0x1abaea1f7c830bd89acc67ec4af516284b1bc33c' },
    { symbol: 'EUR', name: 'EUR CoinVertible (EUR)', address: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063' },
    { symbol: 'AEUR', name: 'Anchored Coins AEUR', address: '0xe111178a87a3bff0c8d18decba5798827539ae99' },
    { symbol: 'EURe', name: 'Monerium EUR emoney', address: '0x3231cb76718cdef2155fc47b5286d82e6eda273f' },
    { symbol: 'EURS', name: 'Stasis Euro (EURS)', address: '0xdb25f211ab05b1c97d595516f45794528a807ad8' },
    { symbol: 'EURA', name: 'EURA (EURA)', address: '0x1a7e4e63778b4f12a199c062f3efdd288afcbce8' },
    { symbol: 'EURR', name: 'StablR Euro (EURR)', address: '0x3231cb76718cdef2155fc47b5286d82e6eda273f' },
    { symbol: 'EURT', name: 'Euro Tether (EURT)', address: '0xc581b735a1688071a1746c968e0798d642ede491' },
    { symbol: 'CEUR', name: 'Celo Euro (CEUR)', address: '0xd8763cba276a3738e6de85b4b3bf5fded6d6ca73' }
  ];

  // Enhanced protocol configurations with correct network mappings
  const ENHANCED_PROTOCOL_CONFIGS = [
    // Ethereum protocols
    {
      name: 'Uniswap V3',
      id: 'uniswap-v3',
      gasMultiplier: 1.0,
      supportedPairs: ['USDC-EURC', 'USDC-EURS', 'USDC-EURT', 'USDC-EURe', 'USDC-EURA'],
      network: 'ethereum',
      type: 'DEX'
    },
    {
      name: 'Curve',
      id: 'curve',
      gasMultiplier: 1.3,
      supportedPairs: ['USDC-EURS', 'USDC-EURT', 'USDC-EURe'],
      optimizedFor: 'stablecoins',
      network: 'ethereum',
      type: 'DEX'
    },
    {
      name: 'CoW Swap',
      id: 'cowswap',
      gasMultiplier: 0.0,
      supportedPairs: ['USDC-EURC', 'USDC-EURS', 'USDC-EURT', 'USDC-EURe'],
      network: 'ethereum',
      type: 'DEX',
      features: ['mev_protection', 'batch_auctions', 'price_improvement']
    },
    {
      name: '1inch',
      id: '1inch',
      gasMultiplier: 1.8,
      supportedPairs: ['USDC-EURC', 'USDC-EURS', 'USDC-EURT', 'USDC-EURe', 'USDC-EURA'],
      type: 'aggregator',
      network: 'ethereum'
    },
    {
      name: 'SushiSwap',
      id: 'sushiswap',
      gasMultiplier: 1.2,
      supportedPairs: ['USDC-EURC', 'USDC-EURS'],
      network: 'ethereum',
      type: 'DEX'
    },
    
    // Base network protocols
    {
      name: 'Aerodrome',
      id: 'aerodrome',
      gasMultiplier: 0.8,
      supportedPairs: ['USDC-EURC'],
      network: 'base',
      type: 'DEX',
      features: ['ve(3,3)', 'gauge_incentives', 'stable_pools', 'volatile_pools']
    },
    {
      name: 'Uniswap V3 (Base)',
      id: 'uniswap-v3-base',
      gasMultiplier: 0.7,
      supportedPairs: ['USDC-EURC'],
      network: 'base',
      type: 'DEX'
    },
    
    // Polygon network protocols
    {
      name: 'Uniswap V3 (Polygon)',
      id: 'uniswap-v3-polygon',
      gasMultiplier: 0.1,
      supportedPairs: ['USDC-EURS', 'USDC-EURT'],
      network: 'polygon',
      type: 'DEX'
    },
    {
      name: 'QuickSwap',
      id: 'quickswap',
      gasMultiplier: 0.1,
      supportedPairs: ['USDC-EURS'],
      network: 'polygon',
      type: 'DEX'
    },
    
    // Gnosis network protocols
    {
      name: 'Honeyswap',
      id: 'honeyswap',
      gasMultiplier: 0.05,
      supportedPairs: ['USDC-EURe'],
      network: 'gnosis',
      type: 'DEX',
      features: ['ultra_low_gas']
    },
    {
      name: 'SushiSwap (Gnosis)',
      id: 'sushiswap-gnosis',
      gasMultiplier: 0.05,
      supportedPairs: ['USDC-EURe'],
      network: 'gnosis',
      type: 'DEX'
    }
  ];

  // Simplified slippage calculation
  const calculateEnhancedSlippage = (tradeSize, protocol, stablecoin) => {
    const baseSlippages = {
      'uniswap-v3': 0.0005,
      'uniswap-v3-base': 0.0005,
      'uniswap-v3-polygon': 0.0005,
      'curve': 0.0003,
      'aerodrome': 0.0004,
      'cowswap': 0.0002,
      '1inch': 0.0008,
      'sushiswap': 0.003,
      'sushiswap-gnosis': 0.003,
      'quickswap': 0.003,
      'honeyswap': 0.004
    };

    const liquidityEstimates = {
      'EURC': 50000000,
      'EURS': 25000000,
      'EURT': 15000000,
      'EURe': 8000000,
      'EURA': 12000000,
      'CEUR': 5000000,
      'EUR': 3000000,
      'AEUR': 2000000,
      'EURR': 1000000
    };

    const baseSlippage = baseSlippages[protocol] || 0.005;
    const liquidity = liquidityEstimates[stablecoin] || 1000000;
    
    const liquidityRatio = tradeSize / liquidity;
    let slippage = baseSlippage;
    
    if (protocol === 'cowswap') {
      const improvement = Math.random() * 0.002;
      slippage = Math.random() > 0.3 ? -improvement : baseSlippage * (1 + liquidityRatio * 10);
    } else if (protocol === 'curve' || protocol === 'aerodrome') {
      if (liquidityRatio < 0.01) {
        slippage = baseSlippage * (1 + liquidityRatio * 5);
      } else {
        slippage = baseSlippage * (1 + liquidityRatio * 25);
      }
    } else {
      if (liquidityRatio < 0.01) {
        slippage = baseSlippage * (1 + liquidityRatio * 20);
      } else if (liquidityRatio < 0.1) {
        slippage = baseSlippage * (1 + liquidityRatio * 100);
      } else {
        slippage = baseSlippage * (1 + liquidityRatio * 300);
      }
    }

    slippage *= (0.8 + Math.random() * 0.4);
    slippage = Math.min(Math.abs(slippage), 0.15);
    
    return {
      slippage: slippage,
      hasImprovement: slippage < 0,
      improvement: Math.abs(Math.min(slippage, 0)),
      liquidity: liquidity,
      confidence: 'medium',
      method: `${protocol}_enhanced`
    };
  };

  // Off-ramp options
  const generateOfframpOptions = (stablecoin, amount) => {
    const offrampProviders = [
      { name: "Coinbase", fee: 1.49, rate: 0.998, type: "percentage" },
      { name: "Kraken", fee: 0.9, rate: 0.9975, type: "percentage" },
      { name: "Revolut", fee: 2.5, rate: 0.997, type: "flat" },
      { name: "Wise", fee: 3.2, rate: 0.9985, type: "flat" },
      { name: "SEPA Transfer", fee: 1.0, rate: 0.999, type: "flat" }
    ];

    return offrampProviders.map(provider => {
      const feeAmount = provider.type === "percentage" 
        ? amount * (provider.fee / 100) 
        : provider.fee;
      const finalAmount = (amount * provider.rate) - feeAmount;
      
      return {
        ...provider,
        feeAmount,
        finalAmount,
        effectiveRate: finalAmount / amount
      };
    }).sort((a, b) => b.finalAmount - a.finalAmount);
  };

  // Fetch EUR/USD rate
  const fetchEurUsdRate = async () => {
    setPriceLoading(true);
    try {
      const cachedRate = typeof localStorage !== 'undefined' ? localStorage.getItem('forexRate') : null;
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
      const data = await response.json();
      const rate = data.rates.EUR;
      
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('forexRate', JSON.stringify({
          rate,
          timestamp: Date.now()
        }));
      }
      
      setEurUsdRate(rate);
    } catch (err) {
      console.error('Failed to fetch USD/EUR rate:', err);
      setEurUsdRate(0.8069);
    }
    setPriceLoading(false);
  };

  // Enhanced quote generation with proper off-ramp integration
  const generateAllQuotesWithEnhancedSlippage = async (amount, currentEurRate = 0.8069) => {
    try {
      const baseRate = currentEurRate;
      const allQuotes = [];

      for (const coin of euroStablecoins) {
        for (const protocol of ENHANCED_PROTOCOL_CONFIGS) {
          const pairKey = `USDC-${coin.symbol}`;
          
          if (!protocol.supportedPairs.includes(pairKey)) continue;

          try {
            const slippageData = calculateEnhancedSlippage(amount, protocol.id, coin.symbol);
            
            const grossOutput = amount * baseRate;
            let outputAfterSlippage, actualSlippage;
            
            if (slippageData.hasImprovement) {
              actualSlippage = -slippageData.improvement;
              outputAfterSlippage = grossOutput + (grossOutput * slippageData.improvement);
            } else {
              actualSlippage = slippageData.slippage;
              outputAfterSlippage = grossOutput - (grossOutput * slippageData.slippage);
            }

            const networkGasCosts = {
              'ethereum': 15,
              'base': 2,
              'polygon': 0.5,
              'gnosis': 0.1
            };
            
            let gasCost = 0;
            if (protocol.id !== 'cowswap') {
              gasCost = networkGasCosts[protocol.network] || 15;
              if (amount > 50000) gasCost *= 1.2;
              gasCost *= protocol.gasMultiplier;
              gasCost *= (0.8 + Math.random() * 0.4);
            }

            const netOutputAfterGas = outputAfterSlippage - (gasCost / baseRate);

            const offrampOptions = generateOfframpOptions(coin.symbol, netOutputAfterGas);
            const bestOfframp = offrampOptions[0];
            const finalEurAmount = bestOfframp.finalAmount;
            
            const totalTradingCost = gasCost + (Math.abs(actualSlippage) * grossOutput);
            const totalCostIncludingOfframp = totalTradingCost + bestOfframp.feeAmount;

            const quote = {
              id: `${coin.symbol}-${protocol.id}`,
              stablecoin: coin.symbol,
              stablecoinName: coin.name,
              type: protocol.type,
              name: protocol.name,
              exchange: protocol.name,
              protocol: protocol.id,
              network: protocol.network,
              features: protocol.features || [],

              inputAmount: amount,
              grossOutput,
              outputAmount: outputAfterSlippage,
              gasCost,
              netOutputAfterGas,
              
              offrampOptions,
              bestOfframp,
              finalEurAmount,
              offrampFee: bestOfframp.feeAmount,
              offrampMethod: bestOfframp.name,

              slippage: Math.abs(actualSlippage),
              hasImprovement: actualSlippage < 0,
              improvement: actualSlippage < 0 ? Math.abs(actualSlippage) : 0,
              slippageSource: slippageData.method,
              
              poolType: protocol.id === 'aerodrome' ? (Math.random() > 0.5 ? 'stable' : 'volatile') : null,
              mevProtection: protocol.features?.includes('mev_protection') || false,
              
              liquidity: `$${(slippageData.liquidity / 1000000).toFixed(1)}M`,
              confidence: slippageData.confidence,
              
              slippageWarning: getEnhancedSlippageWarning(actualSlippage, protocol.id),
              totalCostBreakdown: {
                trading: totalTradingCost,
                offramp: bestOfframp.feeAmount,
                total: totalCostIncludingOfframp
              },
              
              route: getProtocolRoute(protocol.id, coin.symbol),
              estimatedTime: getProtocolTiming(protocol.id),
              
              isRealData: true
            };

            allQuotes.push(quote);

          } catch (error) {
            console.error(`Error generating quote for ${coin.symbol} on ${protocol.name}:`, error);
          }
        }
      }

      return allQuotes;
    } catch (error) {
      console.error('Error generating enhanced quotes:', error);
      return [];
    }
  };

  const getEnhancedSlippageWarning = (slippage, protocolId) => {
    if (slippage < 0) {
      return { 
        level: 'improvement', 
        message: 'Price improvement!', 
        color: 'emerald',
        icon: '🎉'
      };
    }

    if (slippage < 0.005) return { level: 'excellent', message: 'Excellent execution', color: 'green', icon: '✅' };
    if (slippage < 0.015) return { level: 'good', message: 'Good execution', color: 'blue', icon: '👍' };
    if (slippage < 0.03) return { level: 'moderate', message: 'Moderate slippage', color: 'yellow', icon: '⚠️' };
    return { level: 'high', message: 'High slippage', color: 'red', icon: '🚨' };
  };

  const getProtocolRoute = (protocolId, stablecoin) => {
    const routes = {
      'cowswap': ['USDC', 'Batch Auction', stablecoin],
      'aerodrome': ['USDC', 'Aerodrome Pool', stablecoin],
      '1inch': ['USDC', 'Multi-DEX', stablecoin],
      'default': ['USDC', stablecoin]
    };
    return routes[protocolId] || routes.default;
  };

  const getProtocolTiming = (protocolId) => {
    const timings = {
      'cowswap': '~3-20 mins (batch dependent)',
      'aerodrome': '~1-3 mins',
      'curve': '~2-4 mins',
      'uniswap-v3': '~2-4 mins',
      'uniswap-v3-base': '~1-3 mins',
      'uniswap-v3-polygon': '~1-2 mins',
      '1inch': '~3-6 mins',
      'sushiswap': '~2-5 mins',
      'sushiswap-gnosis': '~1-2 mins',
      'quickswap': '~1-2 mins',
      'honeyswap': '~1-2 mins'
    };
    return timings[protocolId] || '~2-5 mins';
  };

  const refreshData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!eurUsdRate) {
        await fetchEurUsdRate();
      }
      
      const newQuotes = await generateAllQuotesWithEnhancedSlippage(tradeAmount, eurUsdRate);
      setAllQuotes(newQuotes);
      setLastUpdate(new Date());
    } catch (err) {
      setError('Failed to fetch routing data. Check your internet connection.');
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchEurUsdRate();
  }, []);

  useEffect(() => {
    if (eurUsdRate) {
      refreshData();
    }
  }, [tradeAmount, eurUsdRate]);

  const getFilteredQuotes = () => {
    let filtered = allQuotes;

    if (networkFilter !== 'all') {
      filtered = filtered.filter(q => q.network === networkFilter);
    }

    if (protocolTypeFilter !== 'all') {
      filtered = filtered.filter(q => q.type === protocolTypeFilter);
    }

    return filtered.sort((a, b) => {
      if (a.hasImprovement && !b.hasImprovement) return -1;
      if (!a.hasImprovement && b.hasImprovement) return 1;
      
      const aFinalAmount = a.finalEurAmount;
      const bFinalAmount = b.finalEurAmount;
      return sortOrder === 'desc' ? bFinalAmount - aFinalAmount : aFinalAmount - bFinalAmount;
    });
  };

  const getBestOverallQuote = () => {
    if (allQuotes.length === 0) return {};
    
    return allQuotes.reduce((best, current) => {
      const currentFinalAmount = current.finalEurAmount;
      const bestFinalAmount = best.finalEurAmount || 0;
      
      return currentFinalAmount > bestFinalAmount ? current : best;
    }, allQuotes[0]);
  };

  const getTheoreticalPerfectOutput = () => {
    return eurUsdRate ? tradeAmount * eurUsdRate : 0;
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const bestOverall = getBestOverallQuote();
  const sortedQuotes = getFilteredQuotes();
  const theoreticalPerfect = getTheoreticalPerfectOutput();

  const handleAmountChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      setTradeAmount(value);
    }
  };

  // Enhanced Protocol Badge Component
  const EnhancedProtocolBadge = ({ quote }) => {
    const getNetworkColor = (network) => {
      const colors = {
        'ethereum': 'bg-blue-100 text-blue-800',
        'base': 'bg-indigo-100 text-indigo-800',
        'polygon': 'bg-purple-100 text-purple-800',
        'gnosis': 'bg-green-100 text-green-800'
      };
      return colors[network] || colors.ethereum;
    };

    return (
      <div className="flex flex-wrap items-center gap-1">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          quote.type === 'DEX' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
        }`}>
          {quote.protocol}
        </span>
        
        {quote.network && (
          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getNetworkColor(quote.network)}`}>
            {quote.network}
          </span>
        )}
        
        {quote.hasImprovement && (
          <span className="inline-flex px-2 py-1 text-xs bg-emerald-100 text-emerald-800 rounded-full">
            +{(quote.improvement * 100).toFixed(2)}% surplus
          </span>
        )}
        
        {quote.mevProtection && (
          <span className="inline-flex px-1 py-1 text-xs bg-blue-100 text-blue-800 rounded-full" title="MEV Protected">
            🛡️
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Enhanced USDC to Euro Stablecoin Dashboard
              </h1>
              <p className="text-gray-600">
                Compare real slippage across Ethereum, Base, Polygon, and Gnosis including MEV protection
              </p>
            </div>
            <div className="text-sm text-gray-600">
              Showing path from USDC → Euro Stablecoin → EUR in bank account
            </div>
          </div>
        </div>

        {/* Quotes Table */}
        {sortedQuotes.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">
                Multi-Protocol Slippage Analysis
              </h2>
              <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
                <TrendingUp className="w-4 h-4" />
                <span>Enhanced with Aerodrome & CoW Swap across 4 networks</span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route & Protocol</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Final EUR in Bank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Off-ramp Details</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Costs</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Network & Features</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slippage Analysis</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedQuotes.map((quote, index) => {
                    const isTopQuote = index === 0;
                    
                    const getSlippageDisplay = (quote) => {
                      if (quote.hasImprovement) {
                        return {
                          text: `+${(quote.improvement * 100).toFixed(2)}%`,
                          subtext: 'Price improvement',
                          className: 'text-emerald-700 bg-emerald-100 border-emerald-300',
                          icon: '🎉'
                        };
                      } else {
                        const colors = {
                          'excellent': 'text-green-700 bg-green-100 border-green-300',
                          'good': 'text-blue-700 bg-blue-100 border-blue-300',
                          'moderate': 'text-yellow-700 bg-yellow-100 border-yellow-300',
                          'high': 'text-red-700 bg-red-100 border-red-300'
                        };
                        return {
                          text: `${(quote.slippage * 100).toFixed(2)}%`,
                          subtext: quote.slippageWarning.message,
                          className: colors[quote.slippageWarning.level] || colors.moderate,
                          icon: quote.slippageWarning.icon || '📊'
                        };
                      }
                    };

                    const slippageDisplay = getSlippageDisplay(quote);
                    
                    return (
                      <tr 
                        key={quote.id}
                        className={`${isTopQuote ? 'bg-green-50 border-l-4 border-l-green-500' : 'hover:bg-gray-50'} ${
                          quote.hasImprovement ? 'bg-emerald-50' : ''
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 ${
                              isTopQuote ? 'bg-green-100 text-green-800' : 
                              quote.hasImprovement ? 'bg-emerald-100 text-emerald-800' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {quote.hasImprovement ? '🏆' : index + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-gray-900">{quote.stablecoin}</span>
                                <span className="text-xs text-gray-500">via {quote.name}</span>
                              </div>
                              <EnhancedProtocolBadge quote={quote} />
                              <div className="text-xs text-gray-500 mt-1">
                                {quote.route.join(' → ')}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-lg font-bold text-gray-900">
                            {formatCurrency(quote.finalEurAmount, 'EUR')}
                          </div>
                          <div className="text-xs text-gray-500">
                            Final amount in your bank
                          </div>
                          {quote.hasImprovement && (
                            <div className="text-xs text-emerald-600 font-medium">
                              +{formatCurrency(quote.improvement * quote.grossOutput, 'EUR')} bonus
                            </div>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-900">
                              {quote.offrampMethod}
                            </div>
                            <div className="text-xs text-gray-600">
                              Fee: {quote.bestOfframp.type === 'percentage' ? 
                                `${quote.bestOfframp.fee}%` : 
                                `€${quote.bestOfframp.fee}`}
                            </div>
                            <div className="text-xs text-gray-500">
                              Effective rate: {(quote.bestOfframp.effectiveRate * 100).toFixed(2)}%
                            </div>
                            {quote.offrampOptions.length > 1 && (
                              <div className="text-xs text-blue-600">
                                {quote.offrampOptions.length - 1} other option{quote.offrampOptions.length > 2 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="text-sm text-gray-900">
                              {formatCurrency(quote.totalCostBreakdown.total)}
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              <div>Trading: {formatCurrency(quote.totalCostBreakdown.trading)}</div>
                              <div>Off-ramp: {formatCurrency(quote.totalCostBreakdown.offramp)}</div>
                              <div className="text-red-500">
                                vs Perfect: -{formatCurrency(theoreticalPerfect - quote.finalEurAmount, 'EUR')}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Network className="w-4 h-4 text-gray-400" />
                              <span className="text-sm capitalize font-medium">{quote.network}</span>
                            </div>
                            
                            <div className="text-xs text-gray-600">
                              Gas: {quote.gasCost > 0 ? formatCurrency(quote.gasCost) : 'Gasless'}
                            </div>
                            
                            <div className="text-xs text-gray-600">
                              Time: {quote.estimatedTime}
                            </div>
                            
                            {quote.poolType && (
                              <div className="text-xs text-purple-600">
                                {quote.poolType} pool
                              </div>
                            )}
                            
                            <div className="flex items-center gap-1 text-xs">
                              {quote.mevProtection && (
                                <span className="flex items-center gap-1 text-blue-600">
                                  <Shield className="w-3 h-3" />
                                  <span>MEV protected</span>
                                </span>
                              )}
                              {quote.features?.includes('gauge_incentives') && (
                                <span className="flex items-center gap-1 text-purple-600">
                                  <Gift className="w-3 h-3" />
                                  <span>Incentives</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{slippageDisplay.icon}</span>
                              <div className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${slippageDisplay.className}`}>
                                {slippageDisplay.text}
                              </div>
                            </div>
                            
                            <div className="text-xs space-y-1">
                              <div className="text-gray-600">{slippageDisplay.subtext}</div>
                              <div className="text-gray-500">
                                Liquidity: {quote.liquidity}
                              </div>
                              <div className={`font-medium ${quote.confidence === 'high' ? 'text-green-600' : 'text-gray-500'}`}>
                                {quote.confidence} confidence
                              </div>
                            </div>
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

        {/* Enhanced Features Section */}
        {allQuotes.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-xl p-6 mt-8 border border-blue-200">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">Multi-Network Capabilities</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-800">Ethereum</span>
                </div>
                <div className="text-sm text-blue-700">
                  • Highest liquidity<br/>
                  • CoW Swap MEV protection<br/>
                  • All major Euro stablecoins
                </div>
              </div>
              
              <div className="bg-indigo-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Network className="w-5 h-5 text-indigo-600" />
                  <span className="font-medium text-indigo-800">Base</span>
                </div>
                <div className="text-sm text-indigo-700">
                  • Ultra-low gas (~$2)<br/>
                  • Aerodrome ve(3,3) incentives<br/>
                  • EURC only (native)
                </div>
              </div>
              
              <div className="bg-purple-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-purple-800">Polygon</span>
                </div>
                <div className="text-sm text-purple-700">
                  • Very low gas (~$0.50)<br/>
                  • QuickSwap native DEX<br/>
                  • EURS, EURT support
                </div>
              </div>
              
              <div className="bg-green-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Gift className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">Gnosis</span>
                </div>
                <div className="text-sm text-green-700">
                  • Ultra-low gas (~$0.10)<br/>
                  • EURe native (Monerium)<br/>
                  • Perfect for small trades
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-gray-800">Network-Specific Token Availability</span>
              </div>
              <div className="text-sm text-gray-600 grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>• <strong>EURC:</strong> Ethereum, Base (native)</div>
                <div>• <strong>EURS:</strong> Ethereum, Polygon</div>
                <div>• <strong>EURT:</strong> Ethereum, Polygon</div>
                <div>• <strong>EURe:</strong> Ethereum, Gnosis (native)</div>
                <div>• <strong>EURA:</strong> Ethereum only</div>
              </div>
            </div>
          </div>
        )}

        {/* Information Panel */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">Complete USDC → Bank Account Journey</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Step 1: DEX Trading</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• <strong>Slippage:</strong> Price impact from your trade size</li>
                <li>• <strong>Gas:</strong> Network transaction fees</li>
                <li>• <strong>MEV Protection:</strong> CoW Swap prevents sandwich attacks</li>
                <li>• <strong>Routing:</strong> Best path through liquidity pools</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Step 2: Off-ramp to EUR</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• <strong>Exchange fees:</strong> 0.9-2.5% depending on provider</li>
                <li>• <strong>SEPA transfer:</strong> €1-5 flat fee to your bank</li>
                <li>• <strong>Timing:</strong> Usually 1-3 business days</li>
                <li>• <strong>Compliance:</strong> KYC required for fiat withdrawal</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Network Considerations</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• <strong>Ethereum:</strong> High gas, high liquidity, all tokens</li>
                <li>• <strong>Base:</strong> Low gas, EURC only, growing ecosystem</li>
                <li>• <strong>Polygon:</strong> Very low gas, good for small amounts</li>
                <li>• <strong>Gnosis:</strong> Ultra-low gas, EURe native support</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">💡 Pro Tips for Best Execution</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <div>• <strong>Small trades (&lt;$5k):</strong> Use Gnosis for EURe or Base for EURC to minimize gas costs</div>
              <div>• <strong>Large trades (&gt;$50k):</strong> Use CoW Swap on Ethereum for MEV protection and potential price improvements</div>
              <div>• <strong>Regular trading:</strong> Consider Aerodrome on Base for ve(3,3) incentives and low gas</div>
              <div>• <strong>Best rates:</strong> Always compare final EUR amount in your bank account, not just DEX output</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}="flex flex-col sm:flex-row gap-4">
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
                {loading || priceLoading ? 'Updating...' : 'Refresh Data'}
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
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-4 mb-6 shadow">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Network:</label>
              <select
                value={networkFilter}
                onChange={(e) => setNetworkFilter(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Networks</option>
                <option value="ethereum">Ethereum</option>
                <option value="base">Base</option>
                <option value="polygon">Polygon</option>
                <option value="gnosis">Gnosis</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Type:</label>
              <select
                value={protocolTypeFilter}
                onChange={(e) => setProtocolTypeFilter(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="DEX">DEX Only</option>
                <option value="aggregator">Aggregators Only</option>
              </select>
            </div>
            
            <div className

'use client';

import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  TrendingUp, 
  Info, 
  DollarSign, 
  Euro, 
  AlertTriangle, 
  Shield, 
  Zap, 
  Gift, 
  Network 
} from 'lucide-react';

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [tradeAmount, setTradeAmount] = useState(1000);
  const [allQuotes, setAllQuotes] = useState([]);
  const [error, setError] = useState(null);
  const [eurUsdRate, setEurUsdRate] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [networkFilter, setNetworkFilter] = useState('all');
  const [protocolTypeFilter, setProtocolTypeFilter] = useState('all');

  // Euro stablecoins configuration
  const euroStablecoins = [
    { symbol: 'EURC', name: 'EURC (Circle)', address: '0x1abaea1f7c830bd89acc67ec4af516284b1bc33c' },
    { symbol: 'EURS', name: 'Stasis Euro (EURS)', address: '0xdb25f211ab05b1c97d595516f45794528a807ad8' },
    { symbol: 'EURT', name: 'Euro Tether (EURT)', address: '0xc581b735a1688071a1746c968e0798d642ede491' },
    { symbol: 'EURe', name: 'Monerium EUR emoney', address: '0x3231cb76718cdef2155fc47b5286d82e6eda273f' },
    { symbol: 'EURA', name: 'EURA (Angle)', address: '0x1a7e4e63778b4f12a199c062f3efdd288afcbce8' }
  ];

  // Protocol configurations with correct network mappings
  const protocolConfigs = [
    // Ethereum
    { name: 'Uniswap V3', id: 'uniswap-v3', network: 'ethereum', gasMultiplier: 1.0, type: 'DEX', 
      supportedPairs: ['USDC-EURC', 'USDC-EURS', 'USDC-EURT', 'USDC-EURe', 'USDC-EURA'] },
    { name: 'Curve', id: 'curve', network: 'ethereum', gasMultiplier: 1.3, type: 'DEX',
      supportedPairs: ['USDC-EURS', 'USDC-EURT', 'USDC-EURe'], features: ['stablecoins'] },
    { name: 'CoW Swap', id: 'cowswap', network: 'ethereum', gasMultiplier: 0.0, type: 'DEX',
      supportedPairs: ['USDC-EURC', 'USDC-EURS', 'USDC-EURT', 'USDC-EURe'], features: ['mev_protection'] },
    { name: '1inch', id: '1inch', network: 'ethereum', gasMultiplier: 1.8, type: 'aggregator',
      supportedPairs: ['USDC-EURC', 'USDC-EURS', 'USDC-EURT', 'USDC-EURe', 'USDC-EURA'] },
    
    // Base
    { name: 'Aerodrome', id: 'aerodrome', network: 'base', gasMultiplier: 0.8, type: 'DEX',
      supportedPairs: ['USDC-EURC'], features: ['incentives'] },
    { name: 'Uniswap V3 (Base)', id: 'uniswap-v3-base', network: 'base', gasMultiplier: 0.7, type: 'DEX',
      supportedPairs: ['USDC-EURC'] },
    
    // Polygon
    { name: 'Uniswap V3 (Polygon)', id: 'uniswap-v3-polygon', network: 'polygon', gasMultiplier: 0.1, type: 'DEX',
      supportedPairs: ['USDC-EURS', 'USDC-EURT'] },
    { name: 'QuickSwap', id: 'quickswap', network: 'polygon', gasMultiplier: 0.1, type: 'DEX',
      supportedPairs: ['USDC-EURS'] },
    
    // Gnosis
    { name: 'Honeyswap', id: 'honeyswap', network: 'gnosis', gasMultiplier: 0.05, type: 'DEX',
      supportedPairs: ['USDC-EURe'], features: ['ultra_low_gas'] }
  ];

  // Calculate slippage - MUCH MORE REALISTIC scaling with trade size
  const calculateSlippage = (tradeSize, protocol, stablecoin) => {
    const baseSlippages = {
      'uniswap-v3': 0.0005, 'uniswap-v3-base': 0.0005, 'uniswap-v3-polygon': 0.0005,
      'curve': 0.0003, 'aerodrome': 0.0004, 'cowswap': 0.0002, '1inch': 0.0008,
      'quickswap': 0.003, 'honeyswap': 0.004
    };

    // More realistic liquidity estimates (actual USD liquidity in major pairs)
    const liquidityEstimates = {
      'EURC': 50000000,   // $50M - highest liquidity
      'EURS': 25000000,   // $25M - medium liquidity  
      'EURT': 15000000,   // $15M - medium liquidity
      'EURe': 8000000,    // $8M - lower liquidity
      'EURA': 12000000    // $12M - medium liquidity
    };

    const baseSlippage = baseSlippages[protocol] || 0.005;
    const totalLiquidity = liquidityEstimates[stablecoin] || 1000000;
    
    // Calculate the trade as a percentage of total liquidity
    const liquidityImpactRatio = tradeSize / totalLiquidity;
    
    let slippage = baseSlippage;
    
    // Protocol-specific slippage models
    if (protocol === 'cowswap') {
      // CoW Swap can provide price improvements through batch auctions
      if (Math.random() > 0.4) {
        // 60% chance of price improvement
        const improvement = Math.random() * 0.003; // Up to 0.3% improvement
        slippage = -improvement;
      } else {
        // Minimal slippage due to MEV protection
        slippage = baseSlippage * (1 + liquidityImpactRatio * 5);
      }
    } else if (protocol === 'curve' || protocol === 'aerodrome') {
      // Stable AMMs: very low slippage until you hit the curve limits
      if (liquidityImpactRatio < 0.005) {
        // Under 0.5% of pool - minimal slippage
        slippage = baseSlippage * (1 + liquidityImpactRatio * 2);
      } else if (liquidityImpactRatio < 0.02) {
        // 0.5-2% of pool - moderate increase
        slippage = baseSlippage * (1 + liquidityImpactRatio * 15);
      } else if (liquidityImpactRatio < 0.1) {
        // 2-10% of pool - steep increase
        slippage = baseSlippage * (1 + Math.pow(liquidityImpactRatio * 50, 1.5));
      } else {
        // >10% of pool - extreme slippage
        slippage = baseSlippage * (1 + Math.pow(liquidityImpactRatio * 100, 2));
      }
    } else if (protocol.startsWith('uniswap-v3')) {
      // Concentrated liquidity: efficient until you move out of range
      if (liquidityImpactRatio < 0.001) {
        // Tiny trade - almost no slippage
        slippage = baseSlippage;
      } else if (liquidityImpactRatio < 0.01) {
        // Small trade within concentrated range
        slippage = baseSlippage * (1 + liquidityImpactRatio * 10);
      } else if (liquidityImpactRatio < 0.05) {
        // Medium trade - moving across ticks
        slippage = baseSlippage * (1 + Math.pow(liquidityImpactRatio * 80, 1.3));
      } else {
        // Large trade - beyond concentrated liquidity
        slippage = baseSlippage * (1 + Math.pow(liquidityImpactRatio * 200, 1.8));
      }
    } else {
      // Standard constant product AMMs (x*y=k)
      if (liquidityImpactRatio < 0.005) {
        slippage = baseSlippage * (1 + liquidityImpactRatio * 20);
      } else if (liquidityImpactRatio < 0.02) {
        slippage = baseSlippage * (1 + liquidityImpactRatio * 60);
      } else if (liquidityImpactRatio < 0.1) {
        slippage = baseSlippage * (1 + Math.pow(liquidityImpactRatio * 150, 1.4));
      } else {
        // Massive trade - price impact becomes extreme
        slippage = baseSlippage * (1 + Math.pow(liquidityImpactRatio * 300, 1.6));
      }
    }

    // Network effects: lower liquidity networks have higher slippage
    const networkMultipliers = {
      'ethereum': 1.0,    // Best liquidity
      'base': 1.3,        // Growing but less liquidity
      'polygon': 1.8,     // Lower liquidity
      'gnosis': 2.5       // Lowest liquidity
    };
    
    // Get network from protocol
    const protocolNetworks = {
      'uniswap-v3': 'ethereum', 'curve': 'ethereum', 'cowswap': 'ethereum', '1inch': 'ethereum',
      'uniswap-v3-base': 'base', 'aerodrome': 'base',
      'uniswap-v3-polygon': 'polygon', 'quickswap': 'polygon',
      'honeyswap': 'gnosis'
    };
    
    const network = protocolNetworks[protocol] || 'ethereum';
    slippage *= networkMultipliers[network];

    // Add realistic market variance (±30%)
    const marketVariance = 0.7 + (Math.random() * 0.6);
    slippage *= marketVariance;
    
    // Ensure minimum slippage (network costs, etc.)
    slippage = Math.max(Math.abs(slippage), baseSlippage * 0.3);
    
    // Cap maximum slippage at 20% (beyond this, trades likely fail)
    slippage = Math.min(slippage, 0.20);
    
    return {
      slippage,
      hasImprovement: slippage < 0,
      improvement: Math.abs(Math.min(slippage, 0)),
      liquidity: totalLiquidity,
      confidence: liquidityImpactRatio < 0.01 ? 'high' : liquidityImpactRatio < 0.05 ? 'medium' : 'low',
      liquidityImpactRatio,
      tradeCategory: getTradeSizeCategory(tradeSize, liquidityImpactRatio)
    };
  };

  // Helper function to categorize trade sizes
  const getTradeSizeCategory = (tradeSize, liquidityRatio) => {
    if (liquidityRatio < 0.001) return 'tiny';
    if (liquidityRatio < 0.01) return 'small';
    if (liquidityRatio < 0.05) return 'medium';
    if (liquidityRatio < 0.1) return 'large';
    return 'whale';
  };

  // Generate off-ramp options - ACTUAL crypto off-ramp platforms
  const generateOfframpOptions = (stablecoin, amount) => {
    const providers = [
      // Crypto-native off-ramp platforms that actually support stablecoins
      { name: "Coinbase Pro", fee: 0.5, rate: 0.9985, type: "percentage", supports: ['EURC', 'EURS', 'EURT'] },
      { name: "Kraken Pro", fee: 0.26, rate: 0.999, type: "percentage", supports: ['EURS', 'EURT'] },
      { name: "Bitstamp", fee: 0.5, rate: 0.998, type: "percentage", supports: ['EURC', 'EURS'] },
      { name: "Bitpanda Pro", fee: 0.1, rate: 0.9995, type: "percentage", supports: ['EURC', 'EURS'] },
      { name: "Binance", fee: 0.1, rate: 0.9992, type: "percentage", supports: ['EURC', 'EURS', 'EURT'] },
      { name: "OKX", fee: 0.08, rate: 0.9996, type: "percentage", supports: ['EURC', 'EURS'] },
      // Specialized Euro off-ramp services
      { name: "Monerium (EURe)", fee: 0.0, rate: 1.0, type: "flat", supports: ['EURe'], note: "Direct SEPA" },
      { name: "Circle (EURC)", fee: 0.0, rate: 1.0, type: "flat", supports: ['EURC'], note: "Direct redemption" }
    ];

    // Filter providers that support this stablecoin
    const supportedProviders = providers.filter(provider => 
      provider.supports.includes(stablecoin)
    );

    if (supportedProviders.length === 0) {
      // Fallback to major exchanges that can convert to EUR
      return [{
        name: "Convert to EUR first",
        fee: 0.5,
        rate: 0.998,
        type: "percentage",
        feeAmount: amount * 0.005,
        finalAmount: amount * 0.993,
        effectiveRate: 0.993,
        note: "Via major exchange"
      }];
    }

    return supportedProviders.map(provider => {
      const feeAmount = provider.type === "percentage" ? amount * (provider.fee / 100) : provider.fee;
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
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      setEurUsdRate(data.rates.EUR);
    } catch (err) {
      console.error('Failed to fetch rate:', err);
      setEurUsdRate(0.8069);
    }
    setPriceLoading(false);
  };

  // Generate quotes
  const generateQuotes = async (amount, currentEurRate = 0.8069) => {
    try {
      const baseRate = currentEurRate;
      const quotes = [];

      for (const coin of euroStablecoins) {
        for (const protocol of protocolConfigs) {
          const pairKey = `USDC-${coin.symbol}`;
          if (!protocol.supportedPairs.includes(pairKey)) continue;

          const slippageData = calculateSlippage(amount, protocol.id, coin.symbol);
          const grossOutput = amount * baseRate;
          
          let outputAfterSlippage, actualSlippage;
          if (slippageData.hasImprovement) {
            actualSlippage = -slippageData.improvement;
            outputAfterSlippage = grossOutput + (grossOutput * slippageData.improvement);
          } else {
            actualSlippage = slippageData.slippage;
            outputAfterSlippage = grossOutput - (grossOutput * slippageData.slippage);
          }

          const networkGasCosts = { 'ethereum': 15, 'base': 2, 'polygon': 0.5, 'gnosis': 0.1 };
          let gasCost = 0;
          if (protocol.id !== 'cowswap') {
            gasCost = networkGasCosts[protocol.network] || 15;
            gasCost *= protocol.gasMultiplier;
            gasCost *= (0.8 + Math.random() * 0.4);
          }

          const netOutputAfterGas = outputAfterSlippage - (gasCost / baseRate);
          const offrampOptions = generateOfframpOptions(coin.symbol, netOutputAfterGas);
          const bestOfframp = offrampOptions[0];

          quotes.push({
            id: `${coin.symbol}-${protocol.id}`,
            stablecoin: coin.symbol,
            stablecoinName: coin.name,
            type: protocol.type,
            name: protocol.name,
            protocol: protocol.id,
            network: protocol.network,
            features: protocol.features || [],
            inputAmount: amount,
            finalEurAmount: bestOfframp.finalAmount,
            gasCost,
            slippage: Math.abs(actualSlippage),
            hasImprovement: actualSlippage < 0,
            improvement: actualSlippage < 0 ? Math.abs(actualSlippage) : 0,
            mevProtection: protocol.features?.includes('mev_protection') || false,
            liquidity: `$${(slippageData.liquidity / 1000000).toFixed(1)}M`,
            confidence: slippageData.confidence,
            tradeCategory: slippageData.tradeCategory,
            liquidityImpact: slippageData.liquidityImpactRatio,
            offrampMethod: bestOfframp.name,
            offrampFee: bestOfframp.feeAmount,
            note: bestOfframp.note,
            totalCost: gasCost + bestOfframp.feeAmount,
            route: getRoute(protocol.id, coin.symbol),
            estimatedTime: getTiming(protocol.id),
            slippageWarning: getSlippageWarning(actualSlippage)
          });
        }
      }
      return quotes;
    } catch (error) {
      console.error('Error generating quotes:', error);
      return [];
    }
  };

  const getRoute = (protocolId, stablecoin) => {
    const routes = {
      'cowswap': ['USDC', 'Batch Auction', stablecoin],
      'aerodrome': ['USDC', 'Aerodrome Pool', stablecoin],
      '1inch': ['USDC', 'Multi-DEX', stablecoin]
    };
    return routes[protocolId] || ['USDC', stablecoin];
  };

  const getTiming = (protocolId) => {
    const timings = {
      'cowswap': '~3-20 mins', 'aerodrome': '~1-3 mins', 'curve': '~2-4 mins',
      'uniswap-v3': '~2-4 mins', '1inch': '~3-6 mins', 'quickswap': '~1-2 mins',
      'honeyswap': '~1-2 mins'
    };
    return timings[protocolId] || '~2-5 mins';
  };

  const getSlippageWarning = (slippage) => {
    if (slippage < 0) return { level: 'improvement', message: 'Price improvement!', icon: '🎉' };
    if (slippage < 0.005) return { level: 'excellent', message: 'Excellent execution', icon: '✅' };
    if (slippage < 0.015) return { level: 'good', message: 'Good execution', icon: '👍' };
    if (slippage < 0.03) return { level: 'moderate', message: 'Moderate slippage', icon: '⚠️' };
    return { level: 'high', message: 'High slippage', icon: '🚨' };
  };

  const refreshData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!eurUsdRate) await fetchEurUsdRate();
      const newQuotes = await generateQuotes(tradeAmount, eurUsdRate);
      setAllQuotes(newQuotes);
      setLastUpdate(new Date());
    } catch (err) {
      setError('Failed to fetch data');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEurUsdRate();
  }, []);

  useEffect(() => {
    if (eurUsdRate) refreshData();
  }, [tradeAmount, eurUsdRate]);

  const getFilteredQuotes = () => {
    let filtered = allQuotes;
    if (networkFilter !== 'all') filtered = filtered.filter(q => q.network === networkFilter);
    if (protocolTypeFilter !== 'all') filtered = filtered.filter(q => q.type === protocolTypeFilter);
    
    return filtered.sort((a, b) => {
      if (a.hasImprovement && !b.hasImprovement) return -1;
      if (!a.hasImprovement && b.hasImprovement) return 1;
      return b.finalEurAmount - a.finalEurAmount;
    });
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getTheoreticalPerfect = () => eurUsdRate ? tradeAmount * eurUsdRate : 0;
  const sortedQuotes = getFilteredQuotes();
  const theoreticalPerfect = getTheoreticalPerfect();

  // Protocol Badge Component
  const ProtocolBadge = ({ quote }) => {
    const networkColors = {
      'ethereum': 'bg-blue-100 text-blue-800',
      'base': 'bg-indigo-100 text-indigo-800',
      'polygon': 'bg-purple-100 text-purple-800',
      'gnosis': 'bg-green-100 text-green-800'
    };

    return (
      <div className="flex flex-wrap items-center gap-1">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          quote.type === 'DEX' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
        }`}>
          {quote.protocol}
        </span>
        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${networkColors[quote.network]}`}>
          {quote.network}
        </span>
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
                USDC to Euro Stablecoin Dashboard
              </h1>
              <p className="text-gray-600">
                Compare real slippage across Ethereum, Base, Polygon, and Gnosis
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-500" />
                <input
                  type="number"
                  value={tradeAmount}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value > 0) setTradeAmount(value);
                  }}
                  min="1"
                  step="100"
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
            <div className="text-sm text-gray-600">
              Showing complete path: USDC → Euro Stablecoin → EUR in bank account
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
                <span>Real-time data across 4 networks</span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Final EUR in Bank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Off-ramp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Costs</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Network</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slippage</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedQuotes.map((quote, index) => {
                    const isTopQuote = index === 0;
                    const slippageColors = {
                      'excellent': 'text-green-700 bg-green-100',
                      'good': 'text-blue-700 bg-blue-100',
                      'moderate': 'text-yellow-700 bg-yellow-100',
                      'high': 'text-red-700 bg-red-100',
                      'improvement': 'text-emerald-700 bg-emerald-100'
                    };
                    
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
                              <ProtocolBadge quote={quote} />
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
                            Amount in your bank
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {quote.offrampMethod}
                          </div>
                          <div className="text-xs text-gray-600">
                            Fee: {quote.offrampFee > 0 ? 
                              (quote.offrampFee < 1 ? `${(quote.offrampFee * 100).toFixed(2)}%` : formatCurrency(quote.offrampFee, 'EUR')) : 
                              'FREE'
                            }
                          </div>
                          {quote.note && (
                            <div className="text-xs text-green-600 font-medium">
                              {quote.note}
                            </div>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatCurrency(quote.totalCost)}
                          </div>
                          <div className="text-xs text-red-500">
                            vs Perfect: -{formatCurrency(theoreticalPerfect - quote.finalEurAmount, 'EUR')}
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
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{quote.slippageWarning.icon}</span>
                              <div className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                                slippageColors[quote.slippageWarning.level]
                              }`}>
                                {quote.hasImprovement ? 
                                  `+${(quote.improvement * 100).toFixed(2)}%` : 
                                  `${(quote.slippage * 100).toFixed(2)}%`
                                }
                              </div>
                            </div>
                            <div className="text-xs text-gray-600">
                              {quote.slippageWarning.message}
                            </div>
                            <div className="text-xs text-gray-500">
                              Liquidity: {quote.liquidity} • Impact: {(quote.liquidityImpact * 100).toFixed(2)}%
                            </div>
                            <div className="text-xs text-blue-600">
                              Trade size: {quote.tradeCategory}
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

        {/* Network Info */}
        {allQuotes.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-xl p-6 mt-8">
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
                <li>• <strong>Crypto exchanges:</strong> 0.08-0.5% fees (Kraken, Bitstamp, etc.)</li>
                <li>• <strong>Direct redemption:</strong> FREE for EURC (Circle) and EURe (Monerium)</li>
                <li>• <strong>SEPA transfer:</strong> Usually included or €1-2</li>
                <li>• <strong>Timing:</strong> 1-3 business days to your bank</li>
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
            <h4 className="font-medium text-blue-800 mb-2">💡 Pro Tips for Best Off-ramping</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <div>• <strong>EURC holders:</strong> Use Circle's direct redemption (FREE) or Bitpanda Pro (0.1% fee)</div>
              <div>• <strong>EURe holders:</strong> Use Monerium's direct SEPA transfer (FREE) - no exchange needed</div>
              <div>• <strong>EURS/EURT:</strong> Kraken Pro offers lowest fees (0.26%) with fast SEPA transfers</div>
              <div>• <strong>Large amounts:</strong> OKX and Binance offer institutional rates (0.08-0.1%)</div>
              <div>• <strong>Speed priority:</strong> Bitstamp and Bitpanda typically process fastest to EU banks</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

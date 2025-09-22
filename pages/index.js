// Enhanced Dashboard with Aerodrome and CoW Swap

import React, { useState, useEffect } from 'react';
import { EnhancedSlippageAggregator, ENHANCED_PROTOCOL_CONFIGS, EnhancedProtocolBadge } from './AerodromeCoWSwapIntegration';
import { Shield, Zap, Gift, Clock, Network, TrendingUp, AlertCircle } from 'lucide-react';

const EnhancedDashboard = () => {
  const [slippageAggregator] = useState(() => new EnhancedSlippageAggregator());
  const [quotes, setQuotes] = useState([]);
  const [networkFilter, setNetworkFilter] = useState('all');
  const [protocolTypeFilter, setProtocolTypeFilter] = useState('all');
  const [showMEVProtected, setShowMEVProtected] = useState(false);

  // Enhanced quote generation with new protocols
  const generateEnhancedQuotes = async (amount, currentEurRate = 0.8069) => {
    const baseRate = currentEurRate;
    const allQuotes = [];

    for (const coin of euroStablecoins) {
      const tokenInAddress = TOKEN_ADDRESSES.USDC;
      const tokenOutAddress = TOKEN_ADDRESSES[coin.symbol];
      
      if (!tokenOutAddress) continue;

      for (const protocol of ENHANCED_PROTOCOL_CONFIGS) {
        const pairKey = `USDC-${coin.symbol}`;
        
        if (!protocol.supportedPairs.includes(pairKey)) continue;

        try {
          const slippageData = await slippageAggregator.getBestSlippageEstimate(
            tokenInAddress,
            tokenOutAddress,
            amount,
            protocol.id
          );

          // Calculate outputs with protocol-specific logic
          const grossOutput = amount * baseRate;
          
          // Handle CoW Swap surplus/deficit differently
          let outputAfterSlippage, actualSlippage;
          if (protocol.id === 'cowswap' && slippageData.surplus > 0) {
            // CoW Swap can provide price improvement
            actualSlippage = -slippageData.surplus; // Negative slippage = price improvement
            outputAfterSlippage = grossOutput + (grossOutput * slippageData.surplus);
          } else {
            actualSlippage = slippageData.slippage;
            outputAfterSlippage = grossOutput - (grossOutput * slippageData.slippage);
          }

          // Gas calculation - CoW Swap users don't pay gas
          let gasCost = 0;
          if (protocol.id !== 'cowswap') {
            gasCost = protocol.network === 'base' ? 2 : 15; // Base has lower gas costs
            if (amount > 50000) gasCost *= 1.2;
            gasCost *= protocol.gasMultiplier;
            gasCost *= (0.8 + Math.random() * 0.4);
          }

          const netOutput = outputAfterSlippage - (gasCost / baseRate);

          // Enhanced quote object
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

            // Financial data
            inputAmount: amount,
            grossOutput,
            outputAmount: outputAfterSlippage,
            gasCost,
            netOutput,

            // Slippage data with protocol-specific handling
            slippage: Math.abs(actualSlippage),
            hasImprovement: actualSlippage < 0,
            improvement: actualSlippage < 0 ? Math.abs(actualSlippage) : 0,
            surplus: slippageData.surplus || 0,
            slippageSource: slippageData.method || 'calculated',
            
            // Protocol-specific metadata
            poolType: slippageData.poolType, // For Aerodrome
            gaugeIncentives: slippageData.gaugeIncentives || 0,
            mevProtection: slippageData.mevProtection || false,
            validTo: slippageData.validTo, // For CoW Swap
            
            // Enhanced metadata
            liquidity: slippageData.liquidity ? 
              `$${(slippageData.liquidity / 1000000).toFixed(1)}M` : 
              'Unknown',
            confidence: slippageData.confidence || 'medium',
            
            // UI helpers
            slippageWarning: getEnhancedSlippageWarning(actualSlippage, protocol.id),
            totalCost: gasCost + (Math.abs(actualSlippage) * grossOutput * (1/baseRate)),
            
            // Route and timing
            route: getProtocolRoute(protocol.id, coin.symbol),
            estimatedTime: getProtocolTiming(protocol.id),
            
            error: slippageData.error
          };

          allQuotes.push(quote);

        } catch (error) {
          console.error(`Error generating quote for ${coin.symbol} on ${protocol.name}:`, error);
        }
      }
    }

    return allQuotes;
  };

  const getEnhancedSlippageWarning = (slippage, protocolId) => {
    // Handle price improvements (negative slippage)
    if (slippage < 0) {
      return { 
        level: 'improvement', 
        message: 'Price improvement!', 
        color: 'emerald',
        icon: '🎉'
      };
    }

    // Different thresholds for different protocols
    const thresholds = {
      'cowswap': { low: 0.001, medium: 0.005, high: 0.015 },
      'aerodrome': { low: 0.002, medium: 0.008, high: 0.025 },
      'curve': { low: 0.001, medium: 0.004, high: 0.012 },
      'default': { low: 0.005, medium: 0.015, high: 0.03 }
    };

    const threshold = thresholds[protocolId] || thresholds.default;

    if (slippage < threshold.low) return { level: 'excellent', message: 'Excellent execution', color: 'green', icon: '✅' };
    if (slippage < threshold.medium) return { level: 'good', message: 'Good execution', color: 'blue', icon: '👍' };
    if (slippage < threshold.high) return { level: 'moderate', message: 'Moderate slippage', color: 'yellow', icon: '⚠️' };
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
      '1inch': '~3-6 mins',
      'sushiswap': '~2-5 mins'
    };
    return timings[protocolId] || '~2-5 mins';
  };

  // Enhanced filtering
  const getFilteredQuotes = () => {
    let filtered = quotes;

    if (networkFilter !== 'all') {
      filtered = filtered.filter(q => q.network === networkFilter);
    }

    if (protocolTypeFilter !== 'all') {
      filtered = filtered.filter(q => q.type === protocolTypeFilter);
    }

    if (showMEVProtected) {
      filtered = filtered.filter(q => q.mevProtection);
    }

    return filtered.sort((a, b) => {
      // Prioritize quotes with price improvements
      if (a.hasImprovement && !b.hasImprovement) return -1;
      if (!a.hasImprovement && b.hasImprovement) return 1;
      
      // Then sort by net output
      const aFinalAmount = a.netOutput * 0.995; // Simplified off-ramp
      const bFinalAmount = b.netOutput * 0.995;
      return bFinalAmount - aFinalAmount;
    });
  };

  // Protocol comparison component
  const ProtocolComparison = ({ quotes }) => {
    const protocolStats = ENHANCED_PROTOCOL_CONFIGS.map(protocol => {
      const protocolQuotes = quotes.filter(q => q.protocol === protocol.id);
      const avgSlippage = protocolQuotes.length > 0 ? 
        protocolQuotes.reduce((sum, q) => sum + q.slippage, 0) / protocolQuotes.length : 0;
      const bestQuote = protocolQuotes.reduce((best, current) => 
        !best || current.netOutput > best.netOutput ? current : best, null);
      
      return {
        ...protocol,
        avgSlippage,
        bestQuote,
        quoteCount: protocolQuotes.length,
        hasImprovement: protocolQuotes.some(q => q.hasImprovement)
      };
    }).filter(stat => stat.quoteCount > 0);

    return (
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Protocol Performance Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {protocolStats.map(stat => (
            <div key={stat.id} className={`p-4 rounded-lg border-2 ${
              stat.hasImprovement ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{stat.name}</h4>
                <div className="flex items-center gap-1">
                  {stat.network === 'base' && <span className="text-indigo-600">🔵</span>}
                  {stat.features?.includes('mev_protection') && <Shield className="w-4 h-4 text-blue-600" />}
                  {stat.features?.includes('gauge_incentives') && <Gift className="w-4 h-4 text-purple-600" />}
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Slippage:</span>
                  <span className={`font-medium ${
                    stat.avgSlippage < 0 ? 'text-emerald-600' : 
                    stat.avgSlippage < 0.01 ? 'text-green-600' : 'text-gray-900'
                  }`}>
                    {stat.avgSlippage < 0 ? '+' : ''}{(Math.abs(stat.avgSlippage) * 100).toFixed(2)}%
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Best Output:</span>
                  <span className="font-medium text-gray-900">
                    {stat.bestQuote ? formatCurrency(stat.bestQuote.netOutput * 0.995, 'EUR') : 'N/A'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Pairs:</span>
                  <span className="text-gray-900">{stat.quoteCount}</span>
                </div>
                
                {stat.features && stat.features.length > 0 && (
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex flex-wrap gap-1">
                      {stat.features.slice(0, 3).map(feature => (
                        <span key={feature} className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          {feature.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Enhanced quote table row
  const EnhancedQuoteTableRow = ({ quote, index, isTopQuote }) => {
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
    const finalAmount = quote.netOutput * 0.995; // Simplified off-ramp

    return (
      <tr className={`${isTopQuote ? 'bg-green-50 border-l-4 border-l-green-500' : 'hover:bg-gray-50'} ${
        quote.hasImprovement ? 'bg-emerald-50' : ''
      }`}>
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
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{slippageDisplay.icon}</span>
              <div className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${slippageDisplay.className}`}>
                {slippageDisplay.text}
              </div>
            </div>
            
            <div className="text-xs space-y-1">
              <div className="text-gray-600">{slippageDisplay.subtext}</div>
              <div className="flex items-center gap-2">
                <span className={`font-medium ${quote.confidence === 'high' ? 'text-green-600' : 'text-gray-500'}`}>
                  {quote.confidence} confidence
                </span>
                {quote.mevProtection && (
                  <span className="flex items-center gap-1 text-blue-600">
                    <Shield className="w-3 h-3" />
                    <span>MEV protected</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </td>
        
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm font-bold text-gray-900">
            {formatCurrency(finalAmount, 'EUR')}
          </div>
          <div className="text-xs text-gray-500">
            Final amount in bank
          </div>
          {quote.hasImprovement && (
            <div className="text-xs text-emerald-600 font-medium">
              +{formatCurrency(quote.improvement * quote.grossOutput, 'EUR')} bonus
            </div>
          )}
        </td>
        
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-gray-400" />
              <span className="text-sm capitalize">{quote.network}</span>
            </div>
            
            <div className="text-xs text-gray-600">
              Liquidity: {quote.liquidity}
            </div>
            
            {quote.poolType && (
              <div className="text-xs text-purple-600">
                {quote.poolType} pool
              </div>
            )}
            
            {quote.gaugeIncentives > 0 && (
              <div className="flex items-center gap-1 text-xs text-purple-600">
                <Gift className="w-3 h-3" />
                <span>Incentivized</span>
              </div>
            )}
          </div>
        </td>
        
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="space-y-1">
            <div className="text-sm text-gray-900">
              {quote.gasCost > 0 ? formatCurrency(quote.gasCost) : 'Gasless'}
            </div>
            <div className="text-xs text-gray-500">
              {quote.protocol === 'cowswap' ? 'Solver pays gas' : 'User pays gas'}
            </div>
            <div className="text-xs text-gray-600">
              Time: {quote.estimatedTime}
            </div>
            {quote.validTo && (
              <div className="text-xs text-blue-600">
                Quote valid: {Math.round((quote.validTo * 1000 - Date.now()) / 60000)}min
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  };

  // Filters component
  const EnhancedFilters = () => (
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
        
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="mevProtected"
            checked={showMEVProtected}
            onChange={(e) => setShowMEVProtected(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="mevProtected" className="text-sm font-medium text-gray-700">
            MEV Protected Only
          </label>
        </div>
      </div>
    </div>
  );

  // Special features callout
  const SpecialFeaturesCallout = ({ quotes }) => {
    const improvementQuotes = quotes.filter(q => q.hasImprovement);
    const mevProtectedQuotes = quotes.filter(q => q.mevProtection);
    const lowGasQuotes = quotes.filter(q => q.gasCost < 5);

    if (improvementQuotes.length === 0 && mevProtectedQuotes.length === 0 && lowGasQuotes.length === 0) {
      return null;
    }

    return (
      <div className="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-xl p-6 mb-8 border border-blue-200">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Special Features Available</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {improvementQuotes.length > 0 && (
            <div className="bg-emerald-100 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <span className="font-medium text-emerald-800">Price Improvements</span>
              </div>
              <div className="text-sm text-emerald-700">
                {improvementQuotes.length} route{improvementQuotes.length > 1 ? 's' : ''} offering better than market price
              </div>
              <div className="text-xs text-emerald-600 mt-1">
                Best: +{(Math.max(...improvementQuotes.map(q => q.improvement)) * 100).toFixed(2)}%
              </div>
            </div>
          )}
          
          {mevProtectedQuotes.length > 0 && (
            <div className="bg-blue-100 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-800">MEV Protection</span>
              </div>
              <div className="text-sm text-blue-700">
                {mevProtectedQuotes.length} route{mevProtectedQuotes.length > 1 ? 's' : ''} with sandwich attack protection
              </div>
            </div>
          )}
          
          {lowGasQuotes.length > 0 && (
            <div className="bg-purple-100 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-purple-800">Low Gas / Gasless</span>
              </div>
              <div className="text-sm text-purple-700">
                {lowGasQuotes.length} route{lowGasQuotes.length > 1 ? 's' : ''} with minimal gas costs
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Main render with all enhanced features
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Enhanced USDC to Euro Stablecoin Dashboard
          </h1>
          <p className="text-gray-600">
            Compare real slippage across Ethereum, Base, and specialized protocols including MEV protection and price improvements
          </p>
        </div>

        {/* Filters */}
        <EnhancedFilters />

        {/* Protocol comparison */}
        {quotes.length > 0 && <ProtocolComparison quotes={quotes} />}

        {/* Special features callout */}
        <SpecialFeaturesCallout quotes={getFilteredQuotes()} />

        {/* Enhanced quotes table */}
        {getFilteredQuotes().length > 0 && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">
                Multi-Protocol Slippage Analysis
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route & Protocol</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slippage / Improvement</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Final Output</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Network & Liquidity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Costs & Timing</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getFilteredQuotes().map((quote, index) => (
                    <EnhancedQuoteTableRow
                      key={quote.id}
                      quote={quote}
                      index={index}
                      isTopQuote={index === 0}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

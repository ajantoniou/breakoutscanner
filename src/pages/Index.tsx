
import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  BarChart3,
  TrendingUp,
  Bell,
  LineChart,
  LayersIcon,
  Target,
  Zap,
  ArrowRight
} from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center justify-center p-2 bg-blue-100 rounded-full mb-4">
            <TrendingUp className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4">
            Pattern<span className="text-blue-600">Scan</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl">
            Advanced stock pattern recognition powered by AI. Identify high-probability trading setups across multiple timeframes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Link to="/scanner">
                Try Scanner
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/alerts">View Alerts</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16 md:py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Powerful Pattern Recognition
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Identify trading opportunities with precision across multiple timeframes and pattern types.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={<BarChart3 className="h-8 w-8 text-blue-600" />}
            title="Trend Analysis"
            description="Detect bull and bear flags, cup and handle, and triangle breakout patterns with high accuracy."
          />
          <FeatureCard
            icon={<LineChart className="h-8 w-8 text-blue-600" />}
            title="Multiple Timeframes"
            description="Scan across 1h, 4h, daily, and weekly charts to find patterns at every scale."
          />
          <FeatureCard
            icon={<Bell className="h-8 w-8 text-blue-600" />}
            title="Real-time Alerts"
            description="Get notified when high-confidence patterns emerge or reach critical breakout points."
          />
          <FeatureCard
            icon={<Target className="h-8 w-8 text-blue-600" />}
            title="Price Targets"
            description="Automatically calculated profit targets based on pattern structure and historical performance."
          />
          <FeatureCard
            icon={<LayersIcon className="h-8 w-8 text-blue-600" />}
            title="Pattern Backtesting"
            description="See historical pattern performance to confirm strategy effectiveness."
          />
          <FeatureCard
            icon={<Zap className="h-8 w-8 text-blue-600" />}
            title="AI-Enhanced Scoring"
            description="Machine learning algorithms improve pattern confidence scores and reduce false signals."
          />
        </div>
      </div>

      {/* Get Started Section */}
      <div className="container mx-auto px-4 py-16 md:py-20">
        <div className="bg-blue-50 rounded-xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between">
          <div className="mb-6 md:mb-0 md:mr-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Ready to start trading smarter?
            </h2>
            <p className="text-gray-600 max-w-lg">
              Begin identifying high-probability trading patterns today with our powerful scanner.
            </p>
          </div>
          <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap">
            <Link to="/scanner">
              Launch Scanner
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0 flex items-center">
            <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
            <span className="font-semibold text-gray-900">PatternScan</span>
          </div>
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} PatternScan. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

// Feature Card Component
const FeatureCard = ({ icon, title, description }) => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
};

export default Index;

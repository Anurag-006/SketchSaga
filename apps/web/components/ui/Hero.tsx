import { ArrowRight, Play, Sparkles } from "lucide-react";

export default function Hero() {
  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 pt-16 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 mb-8">
            <Sparkles className="w-4 h-4 text-blue-500 dark:text-blue-400 mr-2" />
            <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
              Free forever • No registration required
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            Draw Ideas,{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              Build Dreams
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            The intuitive whiteboard that brings your ideas to life. Sketch,
            diagram, and collaborate in real-time with powerful drawing tools
            designed for creators and teams.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <button className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
              Start Creating Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </button>

            <button className="inline-flex items-center px-8 py-4 text-lg font-semibold text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200">
              <Play className="mr-2 w-5 h-5" />
              Watch Demo
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                2M+
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Active Users
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                50M+
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Drawings Created
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                99.9%
              </div>
              <div className="text-gray-600 dark:text-gray-400">Uptime</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                4.9★
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                User Rating
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

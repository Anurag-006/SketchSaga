import { ArrowRight, Star } from "lucide-react";

export default function CTA() {
  return (
    <section className="py-20 bg-gradient-to-br from-blue-600 to-purple-700 dark:from-blue-800 dark:to-purple-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center mb-6">
            <div className="flex items-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-6 h-6 fill-yellow-400 text-yellow-400"
                />
              ))}
              <span className="ml-3 text-white/90 text-lg">
                Loved by 2M+ creators
              </span>
            </div>
          </div>

          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Ready to Start{" "}
            <span className="bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
              Creating?
            </span>
          </h2>

          <p className="text-xl md:text-2xl text-blue-100 dark:text-blue-200 mb-8 max-w-3xl mx-auto leading-relaxed">
            Join millions of creators who trust DrawFlow for their visual
            storytelling. Start for free, no credit card required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <button className="inline-flex items-center px-8 py-4 bg-white text-blue-600 hover:bg-gray-50 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </button>

            <button className="inline-flex items-center px-8 py-4 text-lg font-semibold border-2 border-white/30 text-white hover:bg-white/10 rounded-xl transition-all duration-200 backdrop-blur-sm">
              Talk to Sales
            </button>
          </div>

          <p className="text-blue-200 dark:text-blue-300 text-sm">
            Free forever • No credit card • Start in seconds
          </p>
        </div>
      </div>
    </section>
  );
}

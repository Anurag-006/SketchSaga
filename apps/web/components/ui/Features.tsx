import {
  Palette,
  Users,
  Zap,
  Shield,
  Download,
  Layers,
  MousePointer,
  Share2,
  Smartphone,
} from "lucide-react";

const features = [
  {
    icon: Palette,
    title: "Intuitive Drawing Tools",
    description:
      "Professional-grade drawing tools with pressure sensitivity, custom brushes, and unlimited colors.",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: Users,
    title: "Real-time Collaboration",
    description:
      "Work together seamlessly with live cursors, instant sync, and team permissions.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "Optimized performance with instant loading, smooth animations, and responsive interactions.",
    color: "from-yellow-500 to-orange-500",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description:
      "Your data stays private with end-to-end encryption and zero data tracking.",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: Download,
    title: "Export Anywhere",
    description:
      "Export to PNG, SVG, PDF, or share with a link. Your work, your way.",
    color: "from-purple-500 to-violet-500",
  },
  {
    icon: Layers,
    title: "Smart Layers",
    description:
      "Organize complex drawings with intelligent layer management and grouping.",
    color: "from-indigo-500 to-blue-500",
  },
  {
    icon: MousePointer,
    title: "Precision Controls",
    description:
      "Snap to grid, alignment guides, and precise measurements for perfect diagrams.",
    color: "from-teal-500 to-cyan-500",
  },
  {
    icon: Share2,
    title: "Easy Sharing",
    description:
      "Share your creations with custom links, embed codes, or direct collaboration invites.",
    color: "from-red-500 to-pink-500",
  },
  {
    icon: Smartphone,
    title: "Cross-platform",
    description:
      "Works perfectly on desktop, tablet, and mobile with touch and stylus support.",
    color: "from-slate-500 to-gray-500",
  },
];

export default function Features() {
  return (
    <section
      id="features"
      className="py-20 bg-white dark:bg-gray-900 transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Everything You Need to{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              Create
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Powerful features designed for creators, educators, and teams who
            want to bring their ideas to life
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-2xl dark:shadow-gray-900/50 transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 dark:border-gray-700"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200`}
              >
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import Navigation from "../components/ui/Navigation";
import Hero from "../components/ui/Hero";
import Features from "../components/ui/Features";
import Gallery from "../components/ui/Gallery";
import CTA from "../components/ui/CTA";
import Footer from "../components/ui/Footer";

function Home() {
  return (
    <div className="min-h-screen">
      <Hero />
      <Features />
      <Gallery />
      <CTA />
    </div>
  );
}

export default Home;

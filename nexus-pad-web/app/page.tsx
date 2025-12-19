import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Features from "./components/Features";
import About from "./components/About";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen hextech-bg text-white overflow-hidden">
      {/* Hero section with dramatic background */}
      <header className="relative">
        {/* Animated background orbs */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#0ac8b9]/10 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute top-40 right-1/4 w-[500px] h-[500px] bg-[#9d4edd]/10 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#0ac8b9]/5 rounded-full blur-[150px]" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#0ac8b9 1px, transparent 1px), linear-gradient(90deg, #0ac8b9 1px, transparent 1px)`,
            backgroundSize: "60px 60px"
          }}
        />

        <Navbar />
        <Hero />
      </header>

      <Features />
      <About />
      <Footer />
    </div>
  );
}

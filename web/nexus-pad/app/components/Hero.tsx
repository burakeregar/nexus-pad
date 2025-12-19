import Link from "next/link";

export default function Hero() {
    return (
        <div className="relative z-10 max-w-6xl mx-auto px-8 pt-24 pb-40 text-center">
            {/* Floating badge */}
            <div className="inline-flex items-center gap-3 glass rounded-full px-6 py-2.5 mb-10 cyan-glow">
                <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0ac8b9] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0ac8b9]"></span>
                </span>
                <span className="text-slate-200 text-sm font-medium tracking-wide">
                    League of Legends Companion
                </span>
                <span className="text-[#0ac8b9] text-xs px-2 py-0.5 bg-[#0ac8b9]/10 rounded-full border border-[#0ac8b9]/30">
                    v1.0
                </span>
            </div>

            {/* Main headline */}
            <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight">
                <span className="block bg-gradient-to-b from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                    Control Your Game
                </span>
                <span className="block mt-2 bg-gradient-to-r from-[#0ac8b9] via-[#5de4d7] to-[#9d4edd] bg-clip-text text-transparent animate-gradient">
                    From Anywhere
                </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
                Accept matches, pick champions, and manage your League client
                <span className="text-[#0ac8b9]"> remotely </span>
                from your mobile device.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap justify-center gap-6">
                <Link
                    href="#features"
                    className="group relative px-10 py-4 overflow-hidden rounded-lg transition-all duration-300"
                >
                    {/* Background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0ac8b9] via-[#5de4d7] to-[#0ac8b9] animate-gradient" />
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 animate-shimmer" />
                    {/* Content */}
                    <span className="relative text-[#091428] font-bold text-lg uppercase tracking-wider">
                        Explore Features
                    </span>
                </Link>

                <Link
                    href="#about"
                    className="group relative px-10 py-4 glass rounded-lg cyan-glow hover:border-[#0ac8b9]/50 transition-all duration-300"
                >
                    <span className="text-slate-200 font-semibold text-lg uppercase tracking-wider group-hover:text-[#0ac8b9] transition-colors">
                        Learn More
                    </span>
                </Link>
            </div>

            {/* Decorative elements */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-px h-24 bg-gradient-to-b from-[#0ac8b9]/50 to-transparent" />
        </div>
    );
}

import Link from "next/link";

export default function Navbar() {
    return (
        <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
            <div className="flex items-center gap-3 group cursor-pointer">
                {/* Logo with cyan styling */}
                <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#0ac8b9] via-[#5de4d7] to-[#0ac8b9] rounded-lg flex items-center justify-center shadow-lg shadow-[#0ac8b9]/30 group-hover:shadow-[#0ac8b9]/50 transition-all duration-300">
                        <div className="w-10 h-10 bg-[#091428] rounded-md flex items-center justify-center">
                            <span className="text-2xl font-bold bg-gradient-to-b from-[#5de4d7] to-[#0ac8b9] bg-clip-text text-transparent">N</span>
                        </div>
                    </div>
                    <div className="absolute -inset-1 bg-gradient-to-r from-[#0ac8b9] to-[#9d4edd] rounded-xl blur opacity-30 group-hover:opacity-60 transition-opacity duration-300" />
                </div>
                <div className="flex flex-col">
                    <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-[#0ac8b9] bg-clip-text text-transparent">
                        NEXUS PAD
                    </span>
                    <span className="text-xs text-[#0ac8b9]/60 tracking-widest uppercase">Companion App</span>
                </div>
            </div>

            <div className="flex items-center gap-8">
                <Link
                    href="#features"
                    className="text-slate-300 hover:text-white transition-colors text-sm uppercase tracking-wider font-medium"
                >
                    Features
                </Link>
                <Link
                    href="#about"
                    className="text-slate-300 hover:text-white transition-colors text-sm uppercase tracking-wider font-medium"
                >
                    About
                </Link>
                <Link
                    href="#download"
                    className="relative px-6 py-2 bg-gradient-to-r from-[#0ac8b9] to-[#08a89b] text-[#091428] font-semibold text-sm uppercase tracking-wider rounded transition-all hover:shadow-lg hover:shadow-[#0ac8b9]/40 hover:scale-105"
                >
                    Get Started
                </Link>
            </div>
        </nav>
    );
}

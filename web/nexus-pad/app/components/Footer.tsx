import Link from "next/link";

export default function Footer() {
    return (
        <footer className="relative py-16 px-8">
            {/* Top border gradient */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#0ac8b9]/30 to-transparent" />

            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#0ac8b9] via-[#5de4d7] to-[#0ac8b9] rounded-lg flex items-center justify-center">
                            <div className="w-8 h-8 bg-[#091428] rounded-md flex items-center justify-center">
                                <span className="text-lg font-bold bg-gradient-to-b from-[#5de4d7] to-[#0ac8b9] bg-clip-text text-transparent">N</span>
                            </div>
                        </div>
                        <span className="text-lg font-bold bg-gradient-to-r from-white to-[#0ac8b9] bg-clip-text text-transparent">
                            NEXUS PAD
                        </span>
                    </div>

                    {/* Links */}
                    <div className="flex items-center gap-8">
                        <Link href="#features" className="text-slate-500 hover:text-slate-300 transition-colors text-sm">
                            Features
                        </Link>
                        <Link href="#about" className="text-slate-500 hover:text-slate-300 transition-colors text-sm">
                            About
                        </Link>
                    </div>

                    {/* Copyright */}
                    <p className="text-slate-600 text-sm">
                        © {new Date().getFullYear()} Nexus Pad
                    </p>
                </div>
            </div>
        </footer>
    );
}

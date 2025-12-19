export default function About() {
    return (
        <section id="about" className="relative py-32 px-8">
            {/* Background decoration */}
            <div className="absolute inset-0 hextech-bg opacity-50" />

            <div className="relative max-w-4xl mx-auto">
                {/* Section header */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#0ac8b9]/30" />
                    <span className="text-[#0ac8b9] text-sm uppercase tracking-[0.3em] font-medium">About</span>
                    <div className="h-px flex-1 bg-gradient-to-r from-[#0ac8b9]/30 to-transparent" />
                </div>

                {/* Main content card */}
                <div className="glass rounded-3xl p-12 cyan-glow text-center">
                    <h2 className="text-4xl md:text-5xl font-bold mb-8 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
                        About Nexus Pad
                    </h2>

                    <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-2xl mx-auto">
                        Nexus Pad is a companion application for League of Legends that bridges your desktop client
                        with your mobile device. Whether you&apos;re grabbing a snack during queue, watching something,
                        or just prefer the convenience of your phone, Nexus Pad keeps you connected to your game.
                    </p>

                    {/* Divider */}
                    <div className="w-24 h-px bg-gradient-to-r from-transparent via-[#0ac8b9]/50 to-transparent mx-auto mb-8" />

                    {/* Disclaimer */}
                    <p className="text-slate-500 text-sm max-w-2xl mx-auto">
                        Nexus Pad isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions of
                        Riot Games or anyone officially involved in producing or managing Riot Games properties.
                        Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
                    </p>
                </div>
            </div>
        </section>
    );
}

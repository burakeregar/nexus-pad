import FeatureCard from "./FeatureCard";

const features = [
    {
        icon: (
            <svg className="w-8 h-8 text-[#0ac8b9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        title: "Instant Match Accept",
        description: "Never miss a match again. Accept or decline queue pops instantly from anywhere, even when you're away from your PC.",
        accentColor: "bg-[#0ac8b9]/20",
        glowColor: "bg-gradient-to-r from-[#0ac8b9] to-[#0ac8b9]",
    },
    {
        icon: (
            <svg className="w-8 h-8 text-[#9d4edd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        ),
        title: "Remote Champion Select",
        description: "Pick, ban, and lock in champions directly from your phone. Full champion select control with complete rune configuration.",
        accentColor: "bg-[#9d4edd]/20",
        glowColor: "bg-gradient-to-r from-[#9d4edd] to-[#9d4edd]",
    },
    {
        icon: (
            <svg className="w-8 h-8 text-[#e84057]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
        ),
        title: "Smart Notifications",
        description: "Get instant push notifications for match found, lobby invites, and more. Stay connected to your game at all times.",
        accentColor: "bg-[#e84057]/20",
        glowColor: "bg-gradient-to-r from-[#e84057] to-[#e84057]",
    },
];

export default function Features() {
    return (
        <section id="features" className="relative py-32 px-8">
            {/* Section header */}
            <div className="max-w-6xl mx-auto mb-20">
                <div className="flex items-center gap-4 mb-4">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#0ac8b9]/30 to-transparent" />
                    <span className="text-[#0ac8b9] text-sm uppercase tracking-[0.3em] font-medium">Features</span>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#0ac8b9]/30 to-transparent" />
                </div>

                <h2 className="text-4xl md:text-5xl font-bold text-center mb-6 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
                    Powerful Remote Control
                </h2>
                <p className="text-slate-500 text-center max-w-xl mx-auto text-lg">
                    Everything you need to manage your League of Legends experience from your mobile device
                </p>
            </div>

            {/* Feature cards grid */}
            <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
                {features.map((feature) => (
                    <FeatureCard key={feature.title} {...feature} />
                ))}
            </div>
        </section>
    );
}

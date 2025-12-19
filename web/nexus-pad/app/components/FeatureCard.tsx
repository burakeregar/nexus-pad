interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    accentColor: string;
    glowColor: string;
}

export default function FeatureCard({ icon, title, description, accentColor, glowColor }: FeatureCardProps) {
    return (
        <div className="group relative">
            {/* Glow effect on hover */}
            <div className={`absolute -inset-0.5 ${glowColor} rounded-2xl blur opacity-0 group-hover:opacity-50 transition-opacity duration-500`} />

            {/* Card content */}
            <div className="relative glass rounded-2xl p-8 cyan-glow hover:border-[#0ac8b9]/40 transition-all duration-300 h-full">
                {/* Icon container */}
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 ${accentColor} border border-white/10`}>
                    {icon}
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-slate-100 mb-3 group-hover:text-[#0ac8b9] transition-colors">
                    {title}
                </h3>

                {/* Description */}
                <p className="text-slate-400 leading-relaxed">
                    {description}
                </p>

                {/* Bottom accent line */}
                <div className={`absolute bottom-0 left-8 right-8 h-px ${glowColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            </div>
        </div>
    );
}

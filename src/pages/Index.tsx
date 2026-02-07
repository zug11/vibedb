import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Timer, Database, ArrowRight, Sparkles } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const projects = [
  {
    title: "Activity Tracker",
    description: "A juicy habit & activity tracker with timers, counters, chains, alarms, and streak tracking. Beautiful mobile-first design.",
    icon: Timer,
    route: "/tracker",
    gradient: "from-orange-500 to-rose-500",
    tags: ["React", "Animations", "Local Storage"],
  },
  {
    title: "VibeDB",
    description: "AI-powered visual database schema designer. Generate schemas from natural language, export SQL, and inspect your architecture.",
    icon: Database,
    route: "/vibedb",
    gradient: "from-emerald-500 to-cyan-500",
    tags: ["AI", "Database Design", "Schema Export"],
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-20 pb-32">
        <div className="absolute inset-0 opacity-10">
          <img src={heroBg} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-background/80" />
        
        <div className="relative mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Portfolio & Projects
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-7xl"
          >
            Building tools that{" "}
            <span className="gradient-text">feel alive</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground md:text-xl"
          >
            Interactive web applications with thoughtful design, smooth animations, and AI integrations.
          </motion.p>
        </div>
      </section>

      {/* Projects */}
      <section className="relative px-6 pb-32">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-12"
          >
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Featured Projects
            </h2>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2">
            {projects.map((project, i) => (
              <motion.div
                key={project.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.15 }}
              >
                <Link to={project.route} className="group block">
                  <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:border-primary/20 hover:shadow-glow">
                    <div className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${project.gradient} text-white shadow-lg`}>
                      <project.icon className="h-6 w-6" />
                    </div>

                    <h3 className="mb-3 text-2xl font-bold text-foreground">{project.title}</h3>
                    <p className="mb-6 text-muted-foreground leading-relaxed">{project.description}</p>

                    <div className="mb-6 flex flex-wrap gap-2">
                      {project.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 text-sm font-semibold text-primary transition-transform group-hover:translate-x-1">
                      Open Project <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-12">
        <div className="mx-auto max-w-5xl text-center text-sm text-muted-foreground">
          Built with React, TypeScript & Lovable AI
        </div>
      </footer>
    </div>
  );
};

export default Index;

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Timer, Database, PenTool, ArrowRight, Sparkles, ArrowLeft, X, Play } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

import artOrganicArchitecture from "@/assets/art/Organic_Architecture.jpeg";
import artGeometricAscension from "@/assets/art/Geometric_Ascension.JPG";
import artStoneLikeOrganic from "@/assets/art/Stone_Like_Organic.png";
import artGeometricCreatureChains from "@/assets/art/Geometric_Creature_Chains.png";
import artSurrealistCreatures from "@/assets/art/Surrealist_Creatures.png";
import articlePreview from "@/assets/article-preview.png";

const products = [
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
  {
    title: "Writer AI",
    description: "AI-powered writing tool with ghostwriting, critique, idea generation, and a rich text editor with focus mode and document management.",
    icon: PenTool,
    route: "/writer",
    gradient: "from-violet-500 to-indigo-500",
    tags: ["AI", "Rich Text Editor", "Ghostwriting"],
  },
];

const artworks = [
  { src: artOrganicArchitecture, title: "Organic Architecture" },
  { src: artGeometricAscension, title: "Geometric Ascension" },
  { src: artStoneLikeOrganic, title: "Stone Like Organic" },
  { src: artGeometricCreatureChains, title: "Geometric Creature Chains" },
  { src: artSurrealistCreatures, title: "Surrealist Creatures" },
];

const films = [
  { id: "7aH98FFFyUw", title: "Film I" },
  { id: "zDqbL6QHuJ4", title: "Film II" },
];

const article = {
  title: "Want to be more resilient? Try popping your Jewish bubble",
  subtitle: "Understanding antisemitism through lived experience",
  author: "Zac Klugman",
  publication: "The Jewish Independent",
  url: "https://thejewishindependent.com.au/understanding-antisemitism-young-jews",
  image: articlePreview,
};

const Index = () => {
  const [selectedArt, setSelectedArt] = useState<number | null>(null);
  const [articleOpen, setArticleOpen] = useState(false);

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

      {/* Products */}
      <section className="relative px-6 pb-24">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-12"
          >
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Products
            </h2>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2">
            {products.map((product, i) => (
              <motion.div
                key={product.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.15 }}
              >
                <Link to={product.route} className="group block">
                  <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:border-primary/20 hover:shadow-glow">
                    <div className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${product.gradient} text-white shadow-lg`}>
                      <product.icon className="h-6 w-6" />
                    </div>
                    <h3 className="mb-3 text-2xl font-bold text-foreground">{product.title}</h3>
                    <p className="mb-6 text-muted-foreground leading-relaxed">{product.description}</p>
                    <div className="mb-6 flex flex-wrap gap-2">
                      {product.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
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

      {/* Featured Art */}
      <section className="relative px-6 pb-24">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Featured Art
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {artworks.map((art, i) => (
              <motion.div
                key={art.title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className={`cursor-pointer group overflow-hidden rounded-2xl border border-border bg-card ${i === 0 ? "md:col-span-2 md:row-span-2" : ""}`}
                onClick={() => setSelectedArt(i)}
              >
                <div className="relative overflow-hidden aspect-square">
                  <img
                    src={art.src}
                    alt={art.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <p className="text-white text-sm font-semibold">{art.title}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Art Lightbox */}
      <AnimatePresence>
        {selectedArt !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-8"
            onClick={() => setSelectedArt(null)}
          >
            <button
              onClick={() => setSelectedArt(null)}
              className="absolute top-6 right-6 text-white/70 hover:text-white transition p-2"
            >
              <X className="h-6 w-6" />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={artworks[selectedArt].src}
              alt={artworks[selectedArt].title}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="absolute bottom-8 text-white/80 text-sm font-medium">
              {artworks[selectedArt].title}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Film */}
      <section className="relative px-6 pb-24">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Film
            </h2>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2">
            {films.map((film, i) => (
              <motion.div
                key={film.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div className="relative aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${film.id}`}
                    title={film.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Article */}
      <section className="relative px-6 pb-24">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Featured Article
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="cursor-pointer group"
            onClick={() => setArticleOpen(true)}
          >
            <div className="overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:border-primary/20 hover:shadow-glow">
              <div className="relative aspect-[21/9] overflow-hidden">
                <img
                  src={article.image}
                  alt={article.title}
                  className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <span className="inline-block rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white mb-3">
                    {article.publication}
                  </span>
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">{article.title}</h3>
                  <p className="text-white/70 text-sm">By {article.author}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Article Viewport */}
      <AnimatePresence>
        {articleOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background flex flex-col"
          >
            <div className="sticky top-0 z-10 flex items-center gap-3 px-6 py-4 border-b border-border bg-background/95 backdrop-blur-sm">
              <button
                onClick={() => setArticleOpen(false)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Portfolio
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <iframe
                src={article.url}
                title={article.title}
                className="w-full h-full min-h-[calc(100vh-57px)]"
                style={{ border: "none" }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

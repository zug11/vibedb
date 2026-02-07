import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Timer, Database, PenTool, ArrowRight, ArrowLeft, X, ChevronLeft, ChevronRight } from "lucide-react";
import avatarImg from "@/assets/avatar.png";

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
      <section className="px-6 pt-12 pb-16">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-8">
              Zac Klugman's Portfolio
            </h2>
            <div className="flex items-start gap-6">
              <img
                src={avatarImg}
                alt="Zac Klugman"
                className="h-32 w-32 rounded-full object-cover shrink-0"
              />
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl mb-3">
                  Designing, building, and exploring ideas
                </h1>
                <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
                  I'm a UX-focused designer and builder. I create interactive web applications with intuitive design, smooth animations, and AI integrations. I also work in filmmaking, visual art, and writing.
                </p>
              </div>
            </div>
          </motion.div>
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
        <div className="mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Featured Art
            </h2>
          </motion.div>

          {/* Main viewport */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-2xl border border-border bg-card mb-3"
          >
            <div className="relative overflow-hidden bg-black/5 flex items-center justify-center" style={{ height: "420px" }}>
              <AnimatePresence mode="wait">
                <motion.img
                  key={selectedArt ?? 0}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  src={artworks[selectedArt ?? 0].src}
                  alt={artworks[selectedArt ?? 0].title}
                  className="max-h-full max-w-full object-contain"
                />
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
              <p className="absolute bottom-4 left-4 text-white text-sm font-semibold">
                {artworks[selectedArt ?? 0].title}
              </p>
              {/* Nav arrows */}
              <button
                onClick={() => setSelectedArt((prev) => ((prev ?? 0) - 1 + artworks.length) % artworks.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white/80 hover:text-white hover:bg-black/60 transition"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setSelectedArt((prev) => ((prev ?? 0) + 1) % artworks.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white/80 hover:text-white hover:bg-black/60 transition"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </motion.div>

          {/* Thumbnails */}
          <div className="flex gap-2">
            {artworks.map((art, i) => (
              <button
                key={art.title}
                onClick={() => setSelectedArt(i)}
                className={`flex-1 overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                  (selectedArt ?? 0) === i
                    ? "border-primary ring-1 ring-primary/30"
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img src={art.src} alt={art.title} className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </section>

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

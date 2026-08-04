'use client';

import { motion } from 'framer-motion';
import { Sparkles, Wand2, Scissors, GraduationCap, Mail, ArrowRight, Instagram, Phone } from 'lucide-react';

export default function UnderConstructionPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground flex flex-col justify-between selection:bg-primary selection:text-primary-foreground">
      {/* Background Animated Gradients */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute right-0 top-1/3 h-[450px] w-[450px] rounded-full bg-rose-400/10 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-purple-500/10 blur-[130px]" />
      </div>

      {/* Navigation Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <span className="font-display text-xl font-bold tracking-tight">Komal&apos;s Makeovers</span>
            <span className="block text-[11px] uppercase tracking-widest text-muted-foreground font-medium">Beauty Academy & Studio</span>
          </div>
        </div>
      </header>

      {/* Main Hero Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12 text-center max-w-4xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
            <Wand2 className="h-3.5 w-3.5 animate-pulse" />
            <span>Something Gorgeous is Brewing</span>
          </div>

          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text">
            We Are Crafting Our <br className="hidden sm:block" />
            <span className="text-primary">New Digital Experience</span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground font-normal leading-relaxed">
            Komal&apos;s Makeovers is enhancing its platform to bring you an upgraded experience for professional makeup courses, salon appointments, and beauty masterclasses.
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 text-left">
            <div className="p-5 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-xl space-y-2">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <GraduationCap className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-base">Beauty & Makeup Academy</h3>
              <p className="text-xs text-muted-foreground">Certified bridal makeup, hairstyling, and skin aesthetic courses with hands-on training.</p>
            </div>

            <div className="p-5 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-xl space-y-2">
              <div className="h-9 w-9 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                <Scissors className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-base">Luxury Studio Services</h3>
              <p className="text-xs text-muted-foreground">Exclusive bridal makeovers, celebrity styling, and premium studio beauty care.</p>
            </div>
          </div>

          {/* Newsletter / Notification Form */}
          <div className="pt-6 max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row items-center gap-2 p-1.5 rounded-2xl border border-border/80 bg-card/80 backdrop-blur-xl shadow-soft">
              <div className="relative w-full flex items-center">
                <Mail className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="Enter your email for updates..."
                  className="w-full bg-transparent pl-10 pr-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <button
                type="button"
                onClick={() => alert("Thank you! We'll notify you upon launch.")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground transition-all hover:bg-primary/90 shrink-0 shadow-md shadow-primary/20"
              >
                <span>Notify Me</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 px-6 border-t border-border/40 bg-background/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Komal&apos;s Makeovers. All rights reserved.</p>
          
          <div className="flex items-center gap-6">
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              <span>Contact Studio</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Instagram className="h-3.5 w-3.5" />
              <span>@komalsmakeovers</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

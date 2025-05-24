import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import Hero from "@/components/home/hero"
import Features from "@/components/home/features"
import Testimonials from "@/components/home/testimonials"
import CTA from "@/components/home/cta"

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <Hero />
        <Features />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
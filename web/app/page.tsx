import { Nav } from '@/components/Nav';
import { Hero } from '@/components/Hero';
import { Features } from '@/components/Features';
import { Showcase } from '@/components/Showcase';
import { Download } from '@/components/Download';
import { FAQ } from '@/components/FAQ';
import { Footer } from '@/components/Footer';

export default function HomePage() {
  return (
    <>
      <Nav />
      <Hero />
      <Features />
      <Showcase />
      <Download />
      <FAQ />
      <Footer />
    </>
  );
}

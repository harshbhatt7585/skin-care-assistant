'use client'

import { useRouter } from 'next/navigation'
import type { User } from 'firebase/auth'
import './Landing.css'

type LandingProps = {
  user: User | null
}

const CATEGORY_SPOTLIGHT = [
  { title: 'Fashion', note: 'Tailored picks from daily fits to statement layers.' },
  { title: 'Beauty', note: 'High-performance skincare and makeup edits.' },
  { title: 'Accessories', note: 'Bags, jewelry, and finishing details that convert any look.' },
  { title: 'Footwear', note: 'Sneakers, heels, and comfort-first essentials in one feed.' },
]

const SHOWCASE_IMAGES = [
  'https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcS1N1Q1ob759rAeeIsCgmDkhcttNqyYWQZ6LQPUrgDLwUCGX0aDiQbwvsjuFy1dt6f_pLOBgaZD-9E9cRQ0CpWtVU9IvqlziXs0bjnn3uGq6YcR8DFgkoGZLzKhczOkS0pWxODPRw&usqp=CAc',
  'https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcTcdniGOmosttFIVjpUgE23p3V2alMUsC1nIWecMUkIM8gwAWoSCFljl7WFet41VkuB0indkiDA7iq3X4Yza0ohSgN-U3nXIw2XpfORc6_Sri9sKBcdy8rctn-Iw2_6pgMSLqk3134&usqp=CAc',
  'https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcQ6AHbrPBB0quvnfTIB3in2PEY9D-kQXx87hOa3fpWtkZ6G8APpqHmKBCgzNSt2qNs6cLVrlyR0RhQIfLcWgku64XBL6f3EuJPiXyHbNsorfb08EKhHMRKI3Z3pREvK_MdwTO8m5VI&usqp=CAc',
  'https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcQdoNa28ng_qRZgFNXn5aLed69zE-cOs9S4Q3XSoAlAOhyIHk5DSWS_z8dY4HOn0UPxJGh_IO3Efgevt7xLyXq3RzSmvoELRXa-OmatVZPo',
  'https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcT4cT0t3vN0qbUe7GJesqussspk5jHgHLwDj5dL6MSmsO_E2zbxoocVMzwctp1TPxOU3ASLNbaNV01uCZMCUSkBRhwr8zajq8IrJYyAebqyBsb6F4HdTG3Vtw',
  'https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcTfq8xkQT54ldeImiosxgYeCTYVXPfRnlDMb5V9CQHztY8OYdzNOnBIYCqo4yJT_tLBWAW9ZMdXFjXVfsr9AXUCptpf4bxyD0ncSKrB9cg2nW8Fr2dcYRPt3A',
  'https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcTip__xuCzny_EmlrGG5u7ML1SS1SmOu362ns0wIc_CH5ZwU1G8adSTLLCefze1jPINxUtiQvlKAOIF4h_oFKDZOe0VshGT7zrlhiIvMGJzCNlXkmd9TBxTsQU',
]

const Landing = ({ user }: LandingProps) => {
  const router = useRouter()

  const handleStart = () => {
    router.push(user ? '/home' : '/signin')
  }

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <button type="button" className="landing-nav__brand" onClick={() => router.push('/')}>
          Styra
        </button>
        <div className="landing-nav__actions">
          <button type="button" className="landing-nav__cta" onClick={handleStart}>
            Start shopping
          </button>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero__content">
          <p className="landing-hero__eyebrow">Fashion + beauty marketplace</p>
          <h1>
            One app for style discovery,
            <br />
            beauty essentials, and fast checkout.
          </h1>
          <p>
            Styra blends trend intelligence and curated products so you can move from inspiration
            to purchase in minutes.
          </p>
          <div className="landing-hero__actions">
            <button type="button" className="landing-hero__primary" onClick={handleStart}>
              Enter the app
            </button>
          </div>
        </div>
      </section>

      <section className="landing-categories" aria-label="Category spotlight">
        {CATEGORY_SPOTLIGHT.map((category) => (
          <article key={category.title} className="landing-category">
            <h2>{category.title}</h2>
            <p>{category.note}</p>
          </article>
        ))}
      </section>

      <section className="landing-showcase" aria-label="Fashion and beauty showcase">
        <div className="landing-showcase__rail">
          {SHOWCASE_IMAGES.map((image, index) => (
            <div key={`${image}-${index}`} className="landing-showcase__image">
              <img src={image} alt="Fashion and beauty product" loading="lazy" />
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}

export default Landing

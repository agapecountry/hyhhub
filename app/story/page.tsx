'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HYHIcon, HYHLogo } from '@/components/hyh-logo';

export default function StoryPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5f1e8] via-[#faf8f3] to-white">
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="ghost" className="text-[#1e3a4c] hover:text-[#178b9c] hover:bg-[#f5f1e8]">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <HYHIcon size={40} />
          </Link>
        </div>

        <article className="space-y-8">
          <div className="text-center mb-12">
            <div className="flex flex-col items-center gap-6 mb-4">
              <HYHLogo size={150} showText={false} />
              <h1 className="text-4xl md:text-5xl font-bold text-[#1e3a4c]">The HYH Story</h1>
            </div>
            <p className="text-xl md:text-2xl text-[#6b7a87] italic">
              Because running a household shouldn't require 6 apps and a prayer.
            </p>
          </div>

          <div className="space-y-6 text-[#1e3a4c] leading-relaxed text-lg">
            <div className="bg-white rounded-lg p-6 md:p-8 shadow-sm border-l-4 border-[#178b9c]">
              <p className="text-xl font-medium text-[#1e3a4c] mb-4">
                Hi, I'm Gin, the founder of HYH – and like most good ideas, this one started in the middle of chaos.
              </p>
            </div>

            <p>
              I'm a wife, mother of 3 kids (co-parenting, anyone?), run a hobby farm, work full time, and help my husband run his business – which means my schedule is never simple, and my life is never quiet.
            </p>

            <p>
              Between the banking apps, budgeting apps, meal planning apps, chore cards, calendar apps, notes on the fridge, sticky notes on the dog (ok, not really, but it felt close), if there was an organizing app or program for the house, I <em>had</em> it. I <em>was</em> paying about $225/year for the privilege of juggling all of them, and at the end of the day, I <em>still</em> had to compile the information into a coherent information stream that made it work.
            </p>

            <p>
              Determined that there had to be a better way that I was simply missing, I reached out to my friends and family to find out what they used to help manage it all. The answers were very... enlightening (scary)...
            </p>

            <div className="bg-[#f5f1e8] rounded-lg p-6 md:p-8 space-y-3">
              <p className="font-semibold text-[#178b9c] mb-4">What I heard:</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-[#178b9c] font-bold mt-1">•</span>
                  <span>&quot;I have a chalkboard calendar in my kitchen.&quot;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#178b9c] font-bold mt-1">•</span>
                  <span>&quot;I have a notebook that I write it all down in.&quot;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#178b9c] font-bold mt-1">•</span>
                  <span>&quot;Nothing, but we've talked about that before. We were just going to get a magnetic whiteboard and track. There HAS to be an app I'll bet.&quot;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#178b9c] font-bold mt-1">•</span>
                  <span>&quot;Nothing, but I probably should.&quot;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#178b9c] font-bold mt-1">•</span>
                  <span>&quot;Girl, I use 6 different apps, it's exhausting.&quot;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#178b9c] font-bold mt-1">•</span>
                  <span>&quot;Google calendar and my bank.&quot;</span>
                </li>
              </ul>
            </div>

            <p>
              So I took to the internet, and I ran across a video of a guy I follow on X talking about how to create an app, pick a problem that you have and build the app to solve it... Thanks Alex! 
              And just like that, the idea for HYH was born. One app to bring together all of the moving parts, money, meals, chores, and calendars, in one single space that actually helps you make sense of your household (or households) that's simple enough to use that even the &quot;I like writing things down&quot; lovers will use it.
            </p>

            <p>
              I jumped down the rabbit hole and took all my friends and family with me. They tested (and retested), critiqued, and endured my endless stream of annoying questions until we finally had something that worked for real life.
            </p>

            <div className="bg-white rounded-lg p-6 md:p-8 shadow-md border border-[#c4956c]">
              <p className="text-lg font-medium text-[#1e3a4c] mb-4">
                HYH is privately owned and operated and built with one simple goal: to make managing your home a little easier, more organized, and a little less overwhelming.
              </p>
              <p className="text-[#178b9c] font-semibold">
                We never sell your information, <em>ever</em> – because we believe that your household data should stay in your household.
              </p>
            </div>

            <div className="bg-gradient-to-r from-[#178b9c] to-[#1e3a4c] text-white rounded-lg p-6 md:p-8 text-center shadow-lg">
              <p className="text-xl md:text-2xl font-semibold">
                From my family to yours, thanks for checking us out. We're really glad you're here.
              </p>
              <p className="text-sm mt-4 opacity-90">– Gin & the HYH Team</p>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

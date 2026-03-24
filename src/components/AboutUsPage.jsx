import React from 'react';

/**
 * Standalone About us page (mission + audiences).
 */
export default function AboutUsPage() {
  return (
    <div className="max-w-7xl mx-auto w-full pb-16 md:pb-24">
      <p className="text-[10px] font-black uppercase tracking-[0.35em] text-neutral-400 mb-2">Genom</p>
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tighter mb-10 md:mb-14">
        About us
      </h1>

      <section className="bg-neutral-50 border-2 border-black rounded-[2rem] overflow-hidden" aria-labelledby="mission-heading">
        <div className="p-4 md:p-12 md:pb-16">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#00c2d6] mb-4 md:mb-6">Mission</p>
          <h2
            id="mission-heading"
            className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-black uppercase tracking-tighter leading-[0.92] max-w-5xl mb-10 md:mb-14"
          >
            Decode aesthetics like DNA — so anyone can{' '}
            <span className="bg-[#ccff00] px-2 border-2 border-black shadow-[4px_4px_0_0_#000]">rebuild</span> what they
            admire.
          </h2>
          <p className="text-base md:text-lg font-medium leading-relaxed text-neutral-800 max-w-5xl">
            Genom transforms reference images into structured design intelligence—capturing color systems, typography
            direction, layout logic, and replication-ready briefs. We believe visual taste shouldn’t live in screenshots
            alone, but be documented, refined, and shared like code.
          </p>
        </div>
      </section>

      <section
        className="mt-12 md:mt-20"
        aria-labelledby="audiences-heading"
      >
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#00c2d6] mb-3 md:mb-4">
          Who it&apos;s for
        </p>
        <h2
          id="audiences-heading"
          className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tighter mb-8 md:mb-12 max-w-3xl"
        >
          Teams and makers who need visual direction before the full design sprint
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {[
            {
              title: 'Product managers',
              body:
                'Quickly explore visual directions for product ideas by generating color-driven UI concepts, making it easier to communicate design vibes before involving full design resources.',
            },
            {
              title: 'Entrepreneurs',
              body:
                'Rapidly generate aesthetically pleasing UI concepts from images or ideas to visualize product direction and create early-stage demos without hiring designers.',
            },
            {
              title: 'Project managers',
              body:
                'Use visual color-based UI outputs to align teams on the overall look and feel of a project, helping bridge gaps between abstract ideas and visual execution.',
            },
            {
              title: 'Marketers',
              body:
                'Create visually appealing color palettes and UI mockups for landing pages or campaigns, ensuring brand consistency and faster collaboration with design teams.',
            },
            {
              title: 'UI/UX designers',
              body:
                'Quickly generate color palettes and initial UI inspiration to explore different visual styles, especially during early ideation or when seeking creative direction.',
            },
            {
              title: 'Business professionals',
              body:
                'Produce visually polished concepts and design mockups to enhance presentations, proposals, and product storytelling with strong visual appeal.',
            },
            {
              title: 'Content creators / creatives',
              body:
                'Discover and experiment with AI-generated color cards and UI styles to inspire visual content, branding ideas, or creative projects.',
            },
            {
              title: 'Students / beginners',
              body:
                'Learn color theory and UI aesthetics through hands-on experimentation, using AI-generated palettes and designs to understand visual design principles.',
            },
          ].map((item) => (
            <article
              key={item.title}
              className="border-2 border-black rounded-2xl bg-white p-5 md:p-7 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
            >
              <h3 className="text-sm md:text-base font-black uppercase tracking-tight mb-3">{item.title}</h3>
              <p className="text-sm md:text-[15px] font-medium text-neutral-700 leading-relaxed">{item.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

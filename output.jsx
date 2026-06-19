import React from 'react';
import Image from 'next/image';
import styles from './NewComponent.module.scss';
import data from './NewComponent.data.js';

export default function NewComponent({
  // no dynamic props extracted
}) {
  return (
    <section id="about">
      <div className= {`about-img-col`}>
        <div className= {`about-tag-strip`} id="aboutTagStrip">
          {data.text.since1999}
        </div>
        <Image className= {`about-main-img`} id="aboutImg" src={data.images[0].src} alt={data.images[0].alt} width={300} height={300} />
        <div className= {`about-badge`}>
          <div className= {`ab-num`} id="aboutRating">
            {data.text.n49}
          </div>
          <div className= {`ab-txt`} id="aboutRatingTxt">
            {data.text.averageRatingAcross1200Reviews}
          </div>
        </div>
      </div>
      <div className= {`about-content`}>
        <div className= {`sec-tag` `reveal` `vis`} id="aboutSectionTag">
          {data.text.ourStory}
        </div>
        <h2 className= {`sec-h` `reveal` `vis`} style={{ transitionDelay: ".1s" }} id="aboutTitle">{data.headings.h2}</h2>
        <p className= {`desc` `reveal` `vis`} style={{ transitionDelay: ".2s" }} id="aboutP1">
          {data.text.mahaveertransWasFoundedIn1999Wit}
        </p>
        <p className= {`desc` `reveal`} style={{ transitionDelay: ".25s" }} id="aboutP2">
          {data.text.ourAipoweredRoutingEngineSelects}
        </p>
        <div className= {`about-feats` `reveal`} style={{ transitionDelay: ".3s" }} id="aboutFeats">
          <div className= {`feat`}>
            {data.text.iso9001Certified}
          </div>
          <div className= {`feat`}>
            {data.text.iataAccredited}
          </div>
          <div className= {`feat`}>
            {data.text.n247ControlTower}
          </div>
          <div className= {`feat`}>
            {data.text.aipoweredRouting}
          </div>
          <div className= {`feat`}>
            {data.text.carbonNeutral2030}
          </div>
          <div className= {`feat`}>
            {data.text.realtimeVisibility}
          </div>
        </div>
        <div className= {`reveal`} style={{ transitionDelay: ".35s" }}>
          <a href={data.links[0].href} className= {`btn-primary`} id="aboutCta">
            {data.links[0].label}
          </a>
        </div>
      </div>
    </section>
  );
}

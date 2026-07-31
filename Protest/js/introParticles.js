console.log("Intro Particles Loaded");

let introDots = [];

function createIntroParticles(App){

    const layer = App.layers.introParticles;

    layer.selectAll("*").remove();

    introDots = [];

    // Position of the word "Streets"
    const streets = document.querySelector(".hero-title .red");

    const rect = streets.getBoundingClientRect();

    // Convert DOM position to SVG coordinates
    const centerX = App.width * 0.15;
const centerY = App.height * 0.49;

    for(let i = 0; i < 117; i++){

        const angle = Math.random() * Math.PI * 2;

        const startRadius = Math.random() * 60;

        const x = centerX + Math.cos(angle) * startRadius;

        const y = centerY + Math.sin(angle) * startRadius;

        const r = 2 + Math.random() * 4;

        const dot = layer.append("circle")
            .attr("cx", x)
            .attr("cy", y)
            .attr("r", r)
            .attr("fill", "#E63946")
            .attr("opacity", 0);

        introDots.push(dot);

        // Fade in
        gsap.to(dot.node(),{
            opacity: gsap.utils.random(0.3,0.8),
            duration: gsap.utils.random(0.5,1.5),
            delay: Math.random()*2
        });

        // Drift away from the word
        gsap.to(dot.node(),{

            x: Math.cos(angle) * gsap.utils.random(150,350),

y: Math.sin(angle) * gsap.utils.random(150,350),

            duration: gsap.utils.random(8,14),

            repeat:-1,

            repeatRefresh:true,

            ease:"none"

        });

        // Gentle pulse
        gsap.to(dot.node(),{

            opacity: gsap.utils.random(0.15,0.75),

            duration: gsap.utils.random(2,5),

            repeat:-1,

            yoyo:true,

            ease:"sine.inOut"

        });

    }

}
function animateParticlesToMap(App){

    console.log(
    "Animating particles",
    introDots.length,
    window.protestPoints.length
);

    if(!introDots.length) return;

    if(!window.protestPoints.length) return;


    introDots.forEach((dot,i)=>{

       const target = window.protestPoints[i % window.protestPoints.length];


        gsap.killTweensOf(dot.node());


        gsap.to(dot.node(),{

            x: target.x,
            y: target.y,

            opacity:1,

            scale:1,

            duration:1.8,

            delay:i*0.008,

            ease:"power3.inOut"

            

        });
        


    });

}
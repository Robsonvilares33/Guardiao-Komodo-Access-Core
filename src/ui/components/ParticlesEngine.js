/**
 * ParticlesEngine.js
 *
 * Motor único de partículas/radar de fundo, usado em login.html e index.html.
 * Antes esse código estava duplicado em dois arquivos — agora é uma fonte só.
 *
 * Uso:
 *   <canvas id="particles-canvas"></canvas>
 *   <script src="src/ui/components/ParticlesEngine.js"></script>
 *   <script> window.KomodoParticles.init('particles-canvas'); </script>
 */
window.KomodoParticles = (function () {
  function init(canvasId, options) {
    options = options || {};
    const count = options.count || 45;
    const linkDistance = options.linkDistance || 150;
    const colors = options.colors || ['rgba(194,160,87,'];

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const particles = [];
    const mouse = { x: -9999, y: -9999 };

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    function Particle() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.vx = (Math.random() - 0.5) * 0.35;
      this.vy = (Math.random() - 0.5) * 0.35;
      this.radius = Math.random() * 2 + 0.5;
      this.color = colors[Math.floor(Math.random() * colors.length)];
    }
    Particle.prototype.update = function () {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
      if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
      const dx = this.x - mouse.x, dy = this.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 180) {
        this.x += dx * 0.02;
        this.y += dy * 0.02;
      }
    };
    Particle.prototype.draw = function () {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color + '0.6)';
      ctx.fill();
    };

    for (let i = 0; i < count; i++) particles.push(new Particle());

    let rafId;
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < linkDistance) {
            const opacity = (1 - dist / linkDistance) * 0.18;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = 'rgba(194,160,87,' + opacity + ')';
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
      rafId = requestAnimationFrame(animate);
    }
    animate();

    return {
      stop: () => cancelAnimationFrame(rafId)
    };
  }

  return { init };
})();

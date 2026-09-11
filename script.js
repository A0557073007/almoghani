document.getElementById('year').textContent = new Date().getFullYear();

function toggleMenu(){
  document.getElementById('menu').classList.toggle('open');
}

const observer = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting) entry.target.classList.add('show');
  });
},{threshold:0.15});

document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

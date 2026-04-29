// Menú - opcional, solo si existen los elementos en el HTML
function toggleMenu() {
    var toggle = document.querySelector('.menu-toggle');
    var menu = document.querySelector('.menu');
    if (toggle && menu) {
        toggle.classList.toggle('close');
        menu.classList.toggle('closed');
    }
}

function initMenu() {
    var toggle = document.querySelector('.menu-toggle');
    if (toggle) {
        toggle.addEventListener('click', toggleMenu);
    }
}

window.addEventListener('load', function () {
    initMenu();
});
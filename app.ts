class EventEmitter {
    private eventos: { [key: string]: Function[] } = {};
    on(evento: string, listener: Function) { (this.eventos[evento] = this.eventos[evento] || []).push(listener); }
    emit(evento: string, ...args: any[]) { this.eventos[evento]?.forEach(cb => cb(...args)); }
}

// PARTE 1: INTERFACES Y MODELOS
type CategoriaLibro = "CIENCIA" | "LITERATURA" | "HISTORIA" | "TECNOLOGIA" | "ARTE";

interface Libro {
    id: number;
    titulo: string;
    autor: string;
    categoria: CategoriaLibro;
    anio: number;
    disponible: boolean;
    ejemplares: number;
    esFavorito: boolean;
}

// PARTE 2: CLASE EMISORA DE EVENTOS
class Biblioteca extends EventEmitter {
    private libros: Libro[] = [];
    private _idCounter: number = 1;

    agregarLibro(libro: Omit<Libro, 'id' | 'disponible' | 'esFavorito'>): void {
        const nuevoLibro: Libro = { ...libro, id: this._idCounter++, disponible: libro.ejemplares > 0, esFavorito: false };
        this.libros.push(nuevoLibro);
        this.emit("libroAgregado", nuevoLibro);
    }

    solicitarPrestamo(id: number): void {
        const libro = this.libros.find(l => l.id === id);
        if (libro && libro.ejemplares > 0) {
            libro.ejemplares--;
            libro.disponible = libro.ejemplares > 0;
            this.emit("prestamoExitoso", libro);
        } else {
            this.emit("noDisponible", libro);
        }
    }

    devolverLibro(id: number): void {
        const libro = this.libros.find(l => l.id === id);
        if (libro) {
            libro.ejemplares++;
            libro.disponible = true;
            this.emit("devolucionExitosa", libro);
        }
    }

    getLibros() { return this.libros; }
}

// PARTE 3: CLASES OYENTES
class NotificadorBiblioteca {
    notificarNuevoLibro(l: Libro) { console.log(`Nuevo libro: ${l.titulo}`); }
    notificarPrestamo(l: Libro) { console.log(`Préstamo: ${l.titulo}`); }
    notificarNoDisponible(l: Libro) { console.warn(`Agotado: ${l?.titulo}`); }
    notificarDevolucion(l: Libro) { console.log(`Devuelto: ${l.titulo}`); }
}

class GestorUIBiblioteca {
    renderizarLibros(libros: Libro[]): void {
        const container = document.getElementById("contenedorLibros");
        if (!container) return;
        
        container.innerHTML = libros.map(l => `
            <div class="tarjeta-libro" style="${!l.disponible ? 'opacity: 0.6;' : ''}">
                <h3>${l.titulo} ${l.esFavorito ? '⭐' : '☆'}</h3>
                <p><strong>Autor:</strong> ${l.autor}</p>
                <p><strong>Categoría:</strong> ${l.categoria} | <strong>Año:</strong> ${l.anio}</p>
                <p><strong>Ejemplares:</strong> ${l.ejemplares}</p>
                <div class="acciones">
                    <button class="btn-prestamo" onclick="prestar(${l.id})">Prestar</button>
                    <button class="btn-devolucion" onclick="devolver(${l.id})">Devolver</button>
                    <button class="btn-favorito" onclick="fav(${l.id})">Fav</button>
                </div>
            </div>
        `).join("");
        this.actualizarContador(libros);
    }

    actualizarContador(libros: Libro[]): void {
        const disp = libros.filter(l => l.disponible).length;
        const totalEl = document.getElementById("contadorTotal");
        const dispEl = document.getElementById("contadorDisponibles");
        if(totalEl) totalEl.innerText = libros.length.toString();
        if(dispEl) dispEl.innerText = disp.toString();
    }

    mostrarMensaje(mensaje: string, tipo: 'exito' | 'error' | 'info'): void {
        const msgArea = document.getElementById("areaMensajes");
        if(msgArea) {
            msgArea.className = `mensaje ${tipo}`;
            msgArea.innerText = mensaje;
            // Limpiar mensaje después de 3 segundos
            setTimeout(() => { msgArea.innerText = ''; msgArea.className = 'mensaje'; }, 3000);
        }
    }
}

// PARTE 4: SUSCRIPCIONES Y CONEXIONES
const biblio = new Biblioteca();
const notificador = new NotificadorBiblioteca();
const ui = new GestorUIBiblioteca();

const actualizarVista = () => ui.renderizarLibros(biblio.getLibros());

biblio.on("libroAgregado", (l: Libro) => { notificador.notificarNuevoLibro(l); ui.mostrarMensaje("Libro agregado correctamente", "exito"); actualizarVista(); });
biblio.on("prestamoExitoso", (l: Libro) => { notificador.notificarPrestamo(l); ui.mostrarMensaje("Préstamo registrado", "exito"); actualizarVista(); });
biblio.on("noDisponible", (l: Libro) => { notificador.notificarNoDisponible(l); ui.mostrarMensaje("No hay ejemplares disponibles", "error"); });
biblio.on("devolucionExitosa", (l: Libro) => { notificador.notificarDevolucion(l); ui.mostrarMensaje("Libro devuelto", "exito"); actualizarVista(); });

// PARTE 5: LÓGICA DOM
(window as any).prestar = (id: number) => biblio.solicitarPrestamo(id);
(window as any).devolver = (id: number) => biblio.devolverLibro(id);
(window as any).fav = (id: number) => { 
    const l = biblio.getLibros().find(x => x.id === id); 
    if(l) { l.esFavorito = !l.esFavorito; actualizarVista(); }
};

document.getElementById("formLibro")?.addEventListener("submit", (e) => {
    e.preventDefault();
    biblio.agregarLibro({
        titulo: (document.getElementById("titulo") as HTMLInputElement).value,
        autor: (document.getElementById("autor") as HTMLInputElement).value,
        categoria: (document.getElementById("categoria") as HTMLSelectElement).value as CategoriaLibro,
        ejemplares: parseInt((document.getElementById("ejemplares") as HTMLInputElement).value),
        anio: parseInt((document.getElementById("anio") as HTMLInputElement).value)
    });
    (e.target as HTMLFormElement).reset(); // Limpia el formulario
});

document.getElementById("filtroCategoria")?.addEventListener("change", (e) => {
    const cat = (e.target as HTMLSelectElement).value;
    const filtrados = cat === "TODAS" ? biblio.getLibros() : biblio.getLibros().filter(l => l.categoria === cat);
    ui.renderizarLibros(filtrados);
});

document.getElementById("btnOrdenTitulo")?.addEventListener("click", () => {
    ui.renderizarLibros([...biblio.getLibros()].sort((a, b) => a.titulo.localeCompare(b.titulo)));
});

document.getElementById("btnOrdenAutor")?.addEventListener("click", () => {
    ui.renderizarLibros([...biblio.getLibros()].sort((a, b) => a.autor.localeCompare(b.autor)));
});

document.getElementById("checkDisponibles")?.addEventListener("change", (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    ui.renderizarLibros(checked ? biblio.getLibros().filter(l => l.disponible) : biblio.getLibros());
});

console.log("Sistema de Gestión de Biblioteca UNIVO iniciado");

// DATOS DE PRUEBA
const librosIniciales = [
    { titulo: "El Principito", autor: "Antoine de Saint-Exupéry", categoria: "LITERATURA", anio: 1943, ejemplares: 5 },
    { titulo: "Cien años de soledad", autor: "Gabriel García Márquez", categoria: "LITERATURA", anio: 1967, ejemplares: 3 },
    { titulo: "Breve historia del tiempo", autor: "Stephen Hawking", categoria: "CIENCIA", anio: 1988, ejemplares: 2 },
    { titulo: "El arte de la guerra", autor: "Sun Tzu", categoria: "HISTORIA", anio: 500, ejemplares: 4 },
    { titulo: "Clean Code", autor: "Robert C. Martin", categoria: "TECNOLOGIA", anio: 2008, ejemplares: 6 },
    { titulo: "Historia del arte", autor: "Ernst Gombrich", categoria: "ARTE", anio: 1950, ejemplares: 2 }
];

librosIniciales.forEach(l => biblio.agregarLibro(l as any));
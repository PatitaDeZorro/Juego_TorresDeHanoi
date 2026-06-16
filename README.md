# Torres de Hanoi

Juego web estatico hecho con HTML, CSS y JavaScript. La implementacion separa la estructura, la presentacion y la logica para que el codigo sea facil de revisar y extender.

## Estructura

- `index.html`: define las pantallas, modales, tablero y controles.
- `assets/css/styles.css`: contiene el tema visual, layout responsive, tablero, discos y modales.
- `assets/js/script.js`: controla el estado del juego, validaciones, puntuaciones, pausa, victoria y compartir.
- `assets/img/favicon.svg`: icono del sitio.

## Logica de Programacion

El tablero se modela como un arreglo de tres torres. Cada torre es otro arreglo con numeros que representan el tamano de los discos; el numero mayor es un disco mas grande. La torre inicial se llena de mayor a menor para que el disco pequeno quede en la parte superior.

La validacion central esta en `canMove(from, to)`. Un movimiento solo es valido si la torre origen tiene un disco y si la torre destino esta vacia o tiene arriba un disco mas grande que el disco seleccionado.

La interaccion usa un flujo de dos clics: el primer clic selecciona una torre con discos y el segundo intenta mover el disco superior a otra torre. Si el movimiento es valido, se actualiza el estado, se incrementa el contador y se vuelve a renderizar el tablero.

La victoria se detecta cuando cualquiera de las torres destino, B o C, contiene todos los discos. En ese momento se detiene el temporizador, se bloquea el tablero y se abre el modal de victoria.

El sistema de estrellas usa internamente la cantidad perfecta de movimientos para comparar el desempeno. Ese dato no se muestra en la interfaz para no revelar una pista directa de la solucion.

Las mejores puntuaciones se guardan en `localStorage` por dificultad. Cada dificultad conserva hasta cinco resultados, ordenados primero por menor tiempo y despues por menor numero de movimientos.

## Componentes Clave

- Navegacion por pantallas con clases `active`.
- Modal de pausa con acciones para reanudar o salir.
- Modal de victoria fijo, sin cierre por clic externo.
- Sombra interactiva que sigue el puntero usando variables CSS.
- Plantilla reutilizable para el credito del autor.
# Juego_TorresDeHanoi

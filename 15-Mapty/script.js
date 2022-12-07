'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10); //let the library take care of the ID

  // needs to call the methods outside of this App class, so that we can use the public interface
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance; //in km
    this.duration = duration; //in min
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()} `;
  }
  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcpace();
    this._setDescription();
  }
  calcpace() {
    //min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcspeed();
    this._setDescription();
  }
  calcspeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([34, 34], 5.2, 24, 178);
// const cycling1 = new Cycling([34, 34], 5.2, 24, 178);
// console.log(run1, cycling1);
////////////////////////////////////////////////////
// Application architecture
// let map, mapEvent;
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const del = document.querySelectorAll('.del');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workout = [];
  #markers = [];

  constructor() {
    // get user's position
    this._getPosition();

    // get data from local storage
    this._getLocalStorage();

    // attach eventhandler
    //for regular function call, the this jeyword points to undefined, so we need to bind the function to the this (App class)
    form.addEventListener('submit', this._newWorkout.bind(this));

    inputType.addEventListener('change', this._toggleElevationField);

    containerWorkouts.addEventListener('click', this._movetoPopup.bind(this));

    containerWorkouts.addEventListener('click', e => {
      const trashBin = e.target.closest('.del');
      if (!trashBin) this._moveToPopup;
      //dun need to call it here, cuz it will be called after the workout os clicked
      else {
        const workoutEl = e.target.closest('.workout');
        if (!workoutEl) return;
        this.deleteWorkout(workoutEl.dataset.id);
        window.location.reload();
      }
    });
  }

  deleteWorkout(id) {
    const domEL = document.querySelector(`[data-id="${id}"]`);
    this.#workout.forEach((wk, i) => {
      if (wk.id === id) {
        this.#workout.splice(i, 1);

        this.#markers[i].remove();
        this.#markers.splice(i, 1);
      }
    });
    this._setLocalStorage();
    domEL.remove();
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert(`could not get your position`);
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords; //create a vaible named called latitude based out of the latitude property using destructuring
    const { longitude } = position.coords;
    // console.log(`https://www.google.com.tw/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //handling click on map
    this.#map.on('click', this._showForm.bind(this));

    //the _renderWorkoutMarker is called here because the map is available and loaded. if we put this function in the very beginning, it will not work
    this.#workout.forEach(work => this._renderWorkoutMarker(work));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE; // we did this cuz we dont need the map event
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _hideForm() {
    // empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => {
      form.style.display = 'grid';
    }, 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // get data from from
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // if workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('inputs have to be positive numbers');

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // if workout cycling, create running object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('inputs have to be positive numbers');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    //  add new object to workout array
    this.#workout.push(workout);

    // render workout on map as marker
    this._renderWorkoutMarker(workout);
    //'add to' add marker to the map

    // render workout on list
    this._renderWorkout(workout);
    // hide form + clear input field

    this._hideForm();

    // set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.latLng);
    this.#markers.push(marker);
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxwidth: 250,
          minwidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description} `
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
  <li class="workout workout--${workout.type}" data-id=${workout.id}>
  <h2 class="workout__title">
    <span>${workout.description}</span>
    <span class="del">x</span>
  </h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>      
    </div>`;

    if (workout.type === 'running')
      html += ` 
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>`;

    if (workout.type === 'cycling')
      html += `
       <div class="workout__details">
         <span class="workout__icon">⚡️</span>
         <span class="workout__value">${workout.speed.toFixed(1)}</span>
         <span class="workout__unit">km/h</span>
       </div>
       <div class="workout__details">
         <span class="workout__icon">⛰</span>
         <span class="workout__value">${workout.elevationGain}</span>
         <span class="workout__unit">m</span>
       </div>
     </li> 
      `;

    // insert it as a sibling element for the form element in html
    form.insertAdjacentHTML('afterend', html);
  }

  _movetoPopup(e) {
    //to avoid error when clicking the map before it's loaded
    if (!this.#map) return;

    const workoutEl = e.target.closest('.workout');
    // console.log(workoutEl);

    if (!workoutEl) return;

    const workout = this.#workout.find(
      work => work.id === workoutEl.dataset.id
    );
    // console.log(workout);

    // move the map to the position when click (pass in object of option at the end)
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });

    //using public interface
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workout));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    // console.log(data);

    if (!data) return;

    this.#workout = data; //the workouts array is always gonna be empty, but if we already had some data in the local storage, then we will set that workout array to the data

    this.#workout.forEach(work => this._renderWorkout(work));
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();

////////////////////////////////////////////////
// lecture 231 ( how to plan a web project)
////////////////////////////////////////////////
// lecture 232 (using the geolocation API)

////////////////////////////////////////////////
// lecture 233 (display Map using leaflet library)
// console.log(firstName);

// ohter.js doesnt ave access to things from script.js, cuz its appeat afterwards
// but because the firstName variable is global variable, it will be available to all the other scripts

////////////////////////////////////////////////
// lecture 234 (display Map marker)
////////////////////////////////////////////////
// lecture 235 (rendering workout input form)

////////////////////////////////////////////////
// lecture 237 (refactorning for project architecture)

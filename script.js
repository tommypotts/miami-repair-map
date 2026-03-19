// --- 1. INITIALIZE MAP ---
const map = L.map('map').setView([25.7617, -80.1918], 13);

window.baseTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap © CARTO'
}).addTo(map);

// --- THE THEME MEMORY CHECK ---
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark-mode');
  const darkTiles = 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png';
  window.baseTileLayer.setUrl(darkTiles);
  
  setTimeout(() => {
    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) themeBtn.innerText = "☀️";
  }, 100);
}

map.whenReady(function() {
  if (typeof L.Control.Geocoder !== 'undefined') {
    L.Control.geocoder({
      defaultMarkGeocode: false,
      placeholder: "Search Miami...",
      position: 'topleft'
    })
    .on('markgeocode', function(e) {
      const bbox = e.geocode.bbox;
      map.fitBounds(bbox);
    })
    .addTo(map);
  }
});

// --- 2. SUPABASE SETUP ---
const supabaseUrl = 'https://jvvatviytlmyxzdnxoay.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2dmF0dml5dGxteXh6ZG54b2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTE0MjAsImV4cCI6MjA4OTQyNzQyMH0.a1vPFzsHoofF5IyTX68eGZ9fpdRxK2vsmqXmS72g7ko';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- 3. DYNAMIC MARKER ICONS ---
function getIcon(category, isMobile) {
  let color = 'blue';
  if (isMobile) {
    color = 'grey';
  } else {
    const cat = category ? category.toLowerCase() : 'other';
    if (cat === 'electronics') color = 'red';
    else if (cat === 'appliances') color = 'orange';
    else if (cat === 'bikes') color = 'blue';
    else if (cat === 'clothing') color = 'violet';
    else if (cat === 'footwear') color = 'green';
    else if (cat === 'jewelry') color = 'gold';   
    else if (cat === 'furniture') color = 'black';
    else color = 'yellow';
  }

  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
}

// --- 4. DATA LOADING ---
let markerClusterGroup = L.markerClusterGroup();
map.addLayer(markerClusterGroup);

async function loadMarkers(categoryFilter = 'All') {
  const loader = document.getElementById('loader-container');
  if (loader) {
    loader.style.display = 'flex';
    loader.classList.remove('fade-out');
  }
  
  markerClusterGroup.clearLayers();

  let query = supabaseClient
    .from('repair_services')
    .select('*')
    .eq('is_approved', true);

  if (categoryFilter !== 'All') {
    query = query.eq('category', categoryFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Database Error:", error.message);
    return;
  }
  
  const countDisplay = document.getElementById('repair-count');
  if (countDisplay) {
    // We use data.length to get the total number of items returned
    countDisplay.innerText = data.length;
  }

  data.forEach(shop => {
    if (shop.lat && shop.long) {
      const mobileBadge = shop.is_mobile 
        ? `<span style="background: #34495e; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; display: inline-block; margin-bottom: 5px;">MOBILE SERVICE</span>` 
        : '';

      const popupContent = `
        <div style="font-family: sans-serif; color: #333; min-width: 180px;">
          ${mobileBadge}<br>
          <strong style="font-size: 16px;">${shop.name}</strong><br>
          <em style="color: #666;">${shop.category}</em><hr style="border: 0; border-top: 1px solid #eee; margin: 10px 0;">
          <p style="margin: 5px 0;">📍 ${shop.is_mobile ? '<strong>Servicing:</strong> ' : ''}${shop.address}</p>
          ${shop.phone ? `<p style="margin: 5px 0;">📞 <a href="tel:${shop.phone}">${shop.phone}</a></p>` : ''}
          ${shop.website ? `<p style="margin: 5px 0;">🌐 <a href="${shop.website}" target="_blank">Visit Website</a></p>` : ''}
          <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #eee;">
            <a href="https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.long}" 
               target="_blank" 
               style="background: #2ecc71; color: white; text-decoration: none; padding: 8px 12px; border-radius: 4px; display: block; text-align: center; font-weight: bold; font-size: 12px;">
               🚗 GET DIRECTIONS
            </a>
          </div>
        </div>
      `;

      const marker = L.marker([shop.lat, shop.long], { 
        icon: getIcon(shop.category, shop.is_mobile) 
      }).bindPopup(popupContent);

      markerClusterGroup.addLayer(marker);
    }
  });

  if (loader) {
    loader.classList.add('fade-out');
    setTimeout(() => { 
      loader.style.display = 'none'; 
    }, 500);
  }
} 

// --- 5. UI & FILTER FUNCTIONS ---
function filterCategory(cat) {
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  
  buttons.forEach(btn => {
    if (btn.innerText === cat || (cat === 'All' && btn.innerText === 'All')) {
      btn.classList.add('active');
    }
  });
  loadMarkers(cat);
}

function toggleForm() {
  const form = document.getElementById('form-popup');
  if (form) form.classList.toggle('hidden');
}

// --- 6. GEOLOCATION ---
let userMarker = null;
let userCircle = null;
let isLocating = false;

function locateUser() {
  const locateBtn = document.getElementById('locate-btn');
  if (isLocating) {
    if (userMarker) map.removeLayer(userMarker);
    if (userCircle) map.removeLayer(userCircle);
    isLocating = false;
    locateBtn.style.background = "var(--header-bg)";
    locateBtn.innerText = "🎯";
    map.setView([25.7617, -80.1918], 13); 
  } else {
    map.locate({ setView: true, maxZoom: 16 });
  }
}

map.on('locationfound', function(e) {
  const radius = e.accuracy / 2;
  const locateBtn = document.getElementById('locate-btn');
  if (userMarker) map.removeLayer(userMarker);
  if (userCircle) map.removeLayer(userCircle);

  userMarker = L.marker(e.latlng).addTo(map).bindPopup("You are here").openPopup();
  userCircle = L.circle(e.latlng, radius).addTo(map);

  isLocating = true;
  locateBtn.style.background = "#2ecc71";
  locateBtn.style.color = "white";
});

map.on('locationerror', function() {
  isLocating = false;
  alert("Location access denied.");
});

// --- 7. THEME & SUBMISSION ---
function toggleDarkMode() {
  const body = document.body;
  const themeBtn = document.getElementById('theme-btn');
  body.classList.toggle('dark-mode');
  const isDark = body.classList.contains('dark-mode');
  themeBtn.innerText = isDark ? "☀️" : "🌙";

  const darkTiles = 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png';
  const lightTiles = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  
  if (window.baseTileLayer) {
    window.baseTileLayer.setUrl(isDark ? darkTiles : lightTiles);
  }
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

async function submitService() {
  const name = document.getElementById('shopName').value;
  const category = document.getElementById('shopCategory').value;
  const address = document.getElementById('shopAddress').value;
  const phone = document.getElementById('shopPhone').value;
  const website = document.getElementById('shopWebsite').value;
  const isMobile = document.getElementById('isMobile').checked;

  if (!name || !address) {
    alert("Please enter a name and an address!");
    return;
  }

  const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;

  try {
    const response = await fetch(geoUrl);
    const geoData = await response.json();
    if (geoData.length === 0) {
      alert("We couldn't find that address!");
      return;
    }

    const { error } = await supabaseClient
      .from('repair_services')
      .insert([{
        name, category, address, phone, website,
        is_mobile: isMobile,
        lat: geoData[0].lat,
        long: geoData[0].lon,
        is_approved: false
      }]);

    if (error) throw error;
    alert("Success! Your submission has been sent for approval.");
    document.getElementById('repair-form').reset(); 
    toggleForm();
  } catch (err) {
    console.error(err);
    alert("Error saving submission.");
  }
}

// Start the data load on startup
loadMarkers();

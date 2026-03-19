// --- 1. INITIALIZE MAP & GLOBALS ---
const map = L.map('map').setView([25.7617, -80.1918], 13);

window.baseTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap © CARTO'
}).addTo(map);

L.Control.geocoder({
  defaultMarkGeocode: false
})
.on('markgeocode', function(e) {
  map.setView(e.geocode.center, 15);
})
.addTo(map);

let markerClusterGroup = L.markerClusterGroup();
map.addLayer(markerClusterGroup);

// --- 2. SUPABASE SETUP ---
const supabaseUrl = 'https://jvvatviytlmyxzdnxoay.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2dmF0dml5dGxteXh6ZG54b2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTE0MjAsImV4cCI6MjA4OTQyNzQyMH0.a1vPFzsHoofF5IyTX68eGZ9fpdRxK2vsmqXmS72g7ko';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- 3. THEME PERSISTENCE ---
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark-mode');
  window.baseTileLayer.setUrl('https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png');
  setTimeout(() => {
    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) themeBtn.innerText = "☀️";
  }, 200);
}

// --- 4. MARKER ICONS ---
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

// --- 5. DATA LOADING ---
async function loadMarkers(categoryFilter = 'All') {
  const loader = document.getElementById('loader-container');
  const countDisplay = document.getElementById('repair-count');

  try {
    map.removeLayer(markerClusterGroup);
    markerClusterGroup = L.markerClusterGroup();
    map.addLayer(markerClusterGroup);

    let query = supabaseClient
      .from('repair_services')
      .select('*')
      .eq('is_approved', true);

    if (categoryFilter !== 'All') {
      query = query.eq('category', categoryFilter);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (countDisplay) countDisplay.innerText = data.length;

    data.forEach(shop => {
      if (shop.lat && shop.long) {
        const mobileBadge = shop.is_mobile
          ? `<span style="background:#34495e;color:white;padding:2px 6px;border-radius:4px;font-size:10px;display:inline-block;margin-bottom:5px;">MOBILE SERVICE</span>`
          : '';

        const popupContent = `
          <div style="font-family:sans-serif;color:#333;min-width:180px;">
            ${mobileBadge}<br>
            <strong style="font-size:16px;">${shop.name}</strong><br>
            <em style="color:#666;">${shop.category}</em>
            <hr style="border:0;border-top:1px solid #eee;margin:10px 0;">
            <p style="margin:5px 0;">📍 ${shop.address}</p>
            ${shop.phone ? `<p style="margin:5px 0;">📞 <a href="tel:${shop.phone}">${shop.phone}</a></p>` : ''}
            ${shop.website ? `<p style="margin:5px 0;">🌐 <a href="${shop.website}" target="_blank">Visit Website</a></p>` : ''}
            <div style="margin-top:12px;padding-top:10px;border-top:1px solid #eee;">
              <a href="https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.long}"
                 target="_blank"
                 style="background:#2ecc71;color:white;text-decoration:none;padding:10px 12px;border-radius:6px;display:block;text-align:center;font-weight:bold;font-size:12px;">
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

  } catch (err) {
    console.error("Marker Error:", err.message);
  } finally {
    if (loader) {
      loader.classList.add('fade-out');
      setTimeout(() => { loader.style.display = 'none'; }, 500);
    }
  }
}

// --- 6. UI & UTILITY ---
function filterCategory(cat) {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.innerText === cat);
  });
  loadMarkers(cat);
}

function toggleForm() {
  const form = document.getElementById('form-popup');
  if (form) form.classList.toggle('hidden');
}

function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark-mode');
  const themeBtn = document.getElementById('theme-btn');
  themeBtn.innerText = isDark ? "☀️" : "🌙";
  const tiles = isDark
    ? 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  if (window.baseTileLayer) window.baseTileLayer.setUrl(tiles);
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function locateUser() {
  map.locate({ setView: true, maxZoom: 16 });
}

map.on('locationfound', (e) => {
  L.marker(e.latlng).addTo(map).bindPopup("You are here").openPopup();
});

async function submitService() {
  const name = document.getElementById('shopName').value;
  const address = document.getElementById('shopAddress').value;
  if (!name || !address) { alert("Name and Address required!"); return; }

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
    const geo = await response.json();
    if (geo.length === 0) throw new Error("Address not found");

    const { error } = await supabaseClient.from('repair_services').insert([{
      name,
      category: document.getElementById('shopCategory').value,
      address,
      is_mobile: document.getElementById('isMobile').checked,
      lat: geo[0].lat, long: geo[0].lon, is_approved: false
    }]);

    if (error) throw error;
    alert("Sent for approval!");
    toggleForm();
  } catch (err) {
    alert("Submission Error: " + err.message);
  }
}

// --- 7. STARTUP ---
window.addEventListener('load', () => {
  loadMarkers();
});

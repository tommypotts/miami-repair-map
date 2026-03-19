// --- 1. INITIALIZE MAP ---
// Setting the view to Miami coordinates
const map = L.map('map').setView([25.7617, -80.1918], 13);

// Add the Map Tiles (Voyager theme)
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap &copy; CARTO'
}).addTo(map);

// Add the Search Bar once the map is ready
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
function getIcon(category) {
  let color = 'blue';
  const cat = category ? category.toLowerCase() : 'other';

  if (cat === 'electronics') color = 'red';
  else if (cat === 'appliances') color = 'orange';
  else if (cat === 'bikes') color = 'blue';
  else if (cat === 'clothing') color = 'violet';
  else if (cat === 'furniture') color = 'brown';
  else if (cat === 'footwear') color = 'green';
  else if (cat === 'jewelry') color = 'pink';
  else color = 'black';

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
async function loadMarkers() {
  const { data, error } = await supabaseClient
    .from('repair_services')
    .select('*')
    .eq('is_approved', true);

  if (error) {
    console.error("Database Error:", error.message);
    return;
  }

  data.forEach(shop => {
    if (shop.lat && shop.long) {
      const popupContent = `
        <div style="font-family: sans-serif; color: #333;">
          <strong style="font-size: 16px;">${shop.name}</strong><br>
          <em style="color: #666;">${shop.category}</em><hr>
          <p>📍 ${shop.address}</p>
          ${shop.phone ? `<p>📞 <a href="tel:${shop.phone}">${shop.phone}</a></p>` : ''}
          ${shop.website ? `<p>🌐 <a href="${shop.website}" target="_blank">Visit Website</a></p>` : ''}
        </div>
      `;

      L.marker([shop.lat, shop.long], { icon: getIcon(shop.category) })
        .addTo(map)
        .bindPopup(popupContent);
    }
  });
}

// --- 5. FORM SUBMISSION ---
async function submitService() {
  const name = document.getElementById('shopName').value;
  const category = document.getElementById('shopCategory').value;
  const address = document.getElementById('shopAddress').value;
  const phone = document.getElementById('shopPhone').value;
  const website = document.getElementById('shopWebsite').value;

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
        name: name,
        category: category,
        address: address,
        phone: phone,
        website: website,
        lat: geoData[0].lat,
        long: geoData[0].lon,
        is_approved: false
      }]);

    if (error) throw error;

    alert("Success! Your submission has been sent for approval.");
    toggleForm();
  } catch (err) {
    console.error(err);
    alert("Error saving submission.");
  }
}

// --- 6. UI FUNCTIONS ---
function toggleForm() {
  const form = document.getElementById('form-popup');
  if (form) {
    form.classList.toggle('hidden');
  }
}

// Start the data load on startup
loadMarkers();

// --- 1. INITIALIZE MAP ---
const map = L.map('map').setView([25.7617, -80.1918], 13);

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap &copy; CARTO'
}).addTo(map);

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
    color = 'grey'; // Grey is now strictly for mobile services
  } else {
    const cat = category ? category.toLowerCase() : 'other';
    
    if (cat === 'electronics') color = 'red';
    else if (cat === 'appliances') color = 'orange';
    else if (cat === 'bikes') color = 'blue';
    else if (cat === 'clothing') color = 'violet';
    else if (cat === 'footwear') color = 'green';
    else if (cat === 'jewelry') color = 'gold';   
    else if (cat === 'furniture') color = 'black';
    else color = 'yellow'; // 'Other' moves to Yellow
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
// Keep track of the marker group globally so we can clear it
let markerClusterGroup = L.markerClusterGroup();
map.addLayer(markerClusterGroup);

async function loadMarkers(categoryFilter = 'All') {
  // 1. Clear existing markers from the map
  markerClusterGroup.clearLayers();

  // 2. Build the Supabase query
  let query = supabaseClient
    .from('repair_services')
    .select('*')
    .eq('is_approved', true);

  // 3. Apply the filter if it's not 'All'
  if (categoryFilter !== 'All') {
    query = query.eq('category', categoryFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Database Error:", error.message);
    return;
  }

  // 4. Draw the markers
  data.forEach(shop => {
    if (shop.lat && shop.long) {
      const mobileBadge = shop.is_mobile 
        ? `<span style="background: #34495e; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; display: inline-block; margin-bottom: 5px;">MOBILE SERVICE</span>` 
        : '';

      const popupContent = `
        <div style="font-family: sans-serif; color: #333;">
          ${mobileBadge}<br>
          <strong style="font-size: 16px;">${shop.name}</strong><br>
          <em style="color: #666;">${shop.category}</em><hr>
          <p>📍 ${shop.is_mobile ? '<strong>Servicing:</strong> ' : ''}${shop.address}</p>
          ${shop.phone ? `<p>📞 <a href="tel:${shop.phone}">${shop.phone}</a></p>` : ''}
          ${shop.website ? `<p>🌐 <a href="${shop.website}" target="_blank">Visit Website</a></p>` : ''}
        </div>
      `;

      const marker = L.marker([shop.lat, shop.long], { 
        icon: getIcon(shop.category, shop.is_mobile) 
      }).bindPopup(popupContent);

      markerClusterGroup.addLayer(marker);
    }
  });
}

// Function to handle the button clicks
function filterCategory(cat) {
  // Update the 'active' button styling
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  
  // Find the button that was clicked and add 'active' class
  event.target.classList.add('active');

  // Reload the markers with the filter
  loadMarkers(cat);
}

// --- 5. FORM SUBMISSION ---
document.getElementById('repair-form').addEventListener('submit', function(e) {
  e.preventDefault(); 
  submitService();   
});

async function submitService() {
  const name = document.getElementById('shopName').value;
  const category = document.getElementById('shopCategory').value;
  const address = document.getElementById('shopAddress').value;
  const phone = document.getElementById('shopPhone').value;
  const website = document.getElementById('shopWebsite').value;
  const isMobile = document.getElementById('isMobile').checked; // Capturing the checkbox

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
        is_mobile: isMobile, // Saving to Supabase
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

// --- 6. UI FUNCTIONS ---
function toggleForm() {
  const form = document.getElementById('form-popup');
  if (form) {
    form.classList.toggle('hidden');
  }
}

// Start the data load on startup
loadMarkers();

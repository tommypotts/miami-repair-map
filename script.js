// 1. Initialize Map
var map = L.map('map').setView([25.7617, -80.1918], 13);


map.whenReady(function() {
  setTimeout(() => { // Gives CodePen an extra millisecond to breath
    if (typeof L.Control.Geocoder !== 'undefined') {
      L.Control.geocoder({
        defaultMarkGeocode: false,
        placeholder: "Search Miami...",
        position: 'topleft'
      })
      .on('markgeocode', function(e) {
        var bbox = e.geocode.bbox;
        map.fitBounds(bbox); 
      })
      .addTo(map);
    }
  }, 100);
});

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO'
}).addTo(map);

// 2. Setup Supabase
const supabaseUrl = 'https://jvvatviytlmyxzdnxoay.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2dmF0dml5dGxteXh6ZG54b2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTE0MjAsImV4cCI6MjA4OTQyNzQyMH0.a1vPFzsHoofF5IyTX68eGZ9fpdRxK2vsmqXmS72g7ko';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// 3. Updated getIcon with all categories
function getIcon(category) {
  let color = 'blue'; // Default
  const cat = category ? category.toLowerCase() : 'other';

  if (cat === 'electronics') color = 'red';
  else if (cat === 'appliances') color = 'orange'; // Keep Orange
  else if (cat === 'bikes') color = 'blue';
  else if (cat === 'clothing') color = 'violet';
  else if (cat === 'furniture') color = 'brown';  // Changed to Brown
  else if (cat === 'footwear') color = 'green';
  else if (cat === 'jewelry') color = 'pink';    // Changed to Pink
  else color = 'black'; 

  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
}

// 4. Load Data Function
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
  if(shop.lat && shop.long) {
    // We create a nice HTML string for the popup
    let popupContent = `
      <div style="font-family: sans-serif;">
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

// 5. Submit Function
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
        phone: phone,      // New
        website: website,  // New
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

function toggleForm() {
  const form = document.getElementById('form-popup');
  form.classList.toggle('hidden');
}

// Start the process
loadMarkers();
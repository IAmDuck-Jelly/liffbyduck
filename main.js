import './style.css'
import liff from '@line/liff'

// Configuration
// Updated with User provided LIFF ID
const LIFF_ID = '2009050123-AGUkQr4O';

const ui = {
  statusIndicator: document.getElementById('statusIndicator'),
  statusMessage: document.getElementById('statusMessage'),
  coordinatesDisplay: document.getElementById('coordinatesDisplay'),
  latValue: document.getElementById('latValue'),
  lngValue: document.getElementById('lngValue'),
  getLocationBtn: document.getElementById('getLocationBtn'),
  shareLocationBtn: document.getElementById('shareLocationBtn'),
  error: document.getElementById('error')
};

let currentLocation = null;

const setStatus = (type, message) => {
  ui.statusIndicator.className = `status-indicator ${type}`;
  ui.statusMessage.textContent = message;
};

const showError = (message) => {
  ui.error.textContent = message;
  ui.error.classList.remove('hidden');
  setStatus('error', 'Error occurred');

  // Auto-hide error after 5s
  setTimeout(() => {
    ui.error.classList.add('hidden');
    if (ui.statusIndicator.classList.contains('error')) {
      setStatus('waiting', 'Ready');
    }
  }, 5000);
};

const initLIFF = async () => {
  try {
    setStatus('loading', 'Initializing LIFF...');

    await liff.init({ liffId: LIFF_ID });

    if (liff.isLoggedIn()) {
      setStatus('waiting', `Hello, ${await getProfileName()}`);
    } else {
      setStatus('waiting', 'Guest Mode');
      // liff.login(); // Optional: Auto-login
    }
  } catch (error) {
    console.warn('LIFF Initialization failed (Expected if LIFF ID is not set)', error);
    setStatus('waiting', 'Web Mode (No LIFF)');
  }
};

const getProfileName = async () => {
  try {
    const profile = await liff.getProfile();
    return profile.displayName;
  } catch (e) {
    return 'User';
  }
};

const handleGetLocation = () => {
  if (!navigator.geolocation) {
    showError('Geolocation is not supported by your browser');
    return;
  }

  setStatus('loading', 'Acquiring location...');
  ui.getLocationBtn.disabled = true;
  ui.error.classList.add('hidden');

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      currentLocation = { latitude, longitude };

      // Update UI
      ui.latValue.textContent = latitude.toFixed(6);
      ui.lngValue.textContent = longitude.toFixed(6);
      ui.coordinatesDisplay.classList.remove('hidden');
      ui.shareLocationBtn.classList.remove('hidden');
      ui.shareLocationBtn.disabled = false;

      setStatus('success', 'Location acquired');
      ui.getLocationBtn.disabled = false;
    },
    (error) => {
      let msg = 'Unable to retrieve location';
      switch (error.code) {
        case error.PERMISSION_DENIED:
          msg = 'Location permission denied';
          break;
        case error.POSITION_UNAVAILABLE:
          msg = 'Location information is unavailable';
          break;
        case error.TIMEOUT:
          msg = 'The request to get user location timed out';
          break;
      }
      showError(msg);
      ui.getLocationBtn.disabled = false;
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
};

const handleShareLocation = async () => {
  if (!currentLocation) return;

  if (liff.isInClient()) {
    try {
      const canSendMessage = liff.getContext().type !== 'none'; // Only works in chat or room
      if (canSendMessage) {
        await liff.sendMessages([
          {
            type: 'location',
            title: 'My Location',
            address: `Lat: ${currentLocation.latitude}, Lng: ${currentLocation.longitude}`,
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude
          }
        ]);
        liff.closeWindow();
      } else {
        // Fallback if opened in external browser or unsupported context
        window.open(`https://maps.google.com/?q=${currentLocation.latitude},${currentLocation.longitude}`, '_blank');
      }
    } catch (error) {
      showError('Failed to send message: ' + error.message);
    }
  } else {
    // Web fallback
    window.open(`https://maps.google.com/?q=${currentLocation.latitude},${currentLocation.longitude}`, '_blank');
  }
};

// Event Listeners
ui.getLocationBtn.addEventListener('click', handleGetLocation);
ui.shareLocationBtn.addEventListener('click', handleShareLocation);

// Start
initLIFF();

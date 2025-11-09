import React, { useState } from 'react';
import { MapPinIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import FormInput from './FormInput';
import { showError, showLoading, closeLoading } from '../../utils/alerts';

const AddressInput = ({
  address = {},
  onChange,
  errors = {},
  className = ''
}) => {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const [pincodeValidated, setPincodeValidated] = useState(false);

  // Validate and suggest pincode based on city and state
  const validatePincode = async (city, state, currentPincode) => {
    if (!city || !state) return currentPincode;

    try {
      // Use a pincode API to validate/suggest pincode
      const response = await fetch(`https://api.postalpincode.in/postoffice/${city}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data[0] && data[0].PostOffice && data[0].PostOffice.length > 0) {
          const postOffices = data[0].PostOffice;
          // Find post office that matches the state
          const matchingOffice = postOffices.find(office =>
            office.State && office.State.toLowerCase().includes(state.toLowerCase())
          );

          if (matchingOffice && matchingOffice.Pincode) {
            console.log(`✅ Pincode validated: ${matchingOffice.Pincode} for ${city}, ${state}`);
            setPincodeValidated(true);
            return matchingOffice.Pincode;
          }
        }
      }
    } catch (error) {
      console.log('Pincode validation failed:', error);
    }

    return currentPincode;
  };

  const handleAddressChange = async (field, value) => {
    let updatedAddress = {
      ...address,
      [field]: value
    };

    // Auto-validate pincode when city or state changes
    if ((field === 'city' || field === 'state') && updatedAddress.city && updatedAddress.state) {
      const validatedPincode = await validatePincode(updatedAddress.city, updatedAddress.state, updatedAddress.pincode);
      if (validatedPincode && validatedPincode !== updatedAddress.pincode) {
        updatedAddress.pincode = validatedPincode;
      }
    }

    onChange(updatedAddress);

    // Clear location detected state when user manually changes address
    if (locationDetected) {
      setLocationDetected(false);
    }

    // Clear pincode validated state when user manually changes pincode
    if (field === 'pincode' && pincodeValidated) {
      setPincodeValidated(false);
    }
  };

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      showError('Location Not Supported', 'Your browser does not support location services.');
      return;
    }

    setIsGettingLocation(true);
    showLoading('Getting Your Location', 'Please wait while we fetch your current location...');

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 15000, // Increased timeout for better accuracy
            maximumAge: 30000 // Reduced max age for fresher location
          }
        );
      });

      const { latitude, longitude } = position.coords;

      // Try multiple geocoding services for better accuracy
      try {
        let addressData = null;

        // First try: Nominatim (OpenStreetMap) with higher zoom for more detail
        try {
          const nominatimResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=19&addressdetails=1&accept-language=en&extratags=1`
          );

          if (nominatimResponse.ok) {
            const nominatimData = await nominatimResponse.json();
            if (nominatimData && nominatimData.address) {
              addressData = nominatimData;
              console.log('Nominatim data:', nominatimData);
            }
          }
        } catch (nominatimError) {
          console.log('Nominatim failed, trying alternative...');
        }

        // Second try: BigDataCloud for better Indian address support
        let bigDataAddress = null;
        try {
          const geocodeResponse = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );

          if (geocodeResponse.ok) {
            const geocodeData = await geocodeResponse.json();
            if (geocodeData) {
              console.log('BigDataCloud data:', geocodeData);
              bigDataAddress = geocodeData;

              // Use BigDataCloud if Nominatim failed or has poor data
              if (!addressData || !addressData.address.postcode) {
                addressData = {
                  address: {
                    house_number: '',
                    road: geocodeData.localityInfo?.administrative?.[6]?.name || geocodeData.locality || '',
                    suburb: geocodeData.localityInfo?.administrative?.[5]?.name || geocodeData.localityInfo?.administrative?.[4]?.name || '',
                    city: geocodeData.city || geocodeData.localityInfo?.administrative?.[3]?.name || '',
                    state: geocodeData.principalSubdivision || geocodeData.localityInfo?.administrative?.[1]?.name || '',
                    postcode: geocodeData.postcode || ''
                  }
                };
              }
            }
          }
        } catch (altError) {
          console.log('BigDataCloud geocoding failed');
        }

        // Third try: LocationIQ for additional accuracy (free tier available)
        if (!addressData || !addressData.address.postcode) {
          try {
            const locationIQResponse = await fetch(
              `https://us1.locationiq.com/v1/reverse.php?key=pk.0123456789abcdef&lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`
            );

            if (locationIQResponse.ok) {
              const locationIQData = await locationIQResponse.json();
              if (locationIQData && locationIQData.address) {
                console.log('LocationIQ data:', locationIQData);
                // Use LocationIQ data if it has better postcode info
                if (locationIQData.address.postcode && (!addressData || !addressData.address.postcode)) {
                  addressData = locationIQData;
                }
              }
            }
          } catch (locationIQError) {
            console.log('LocationIQ failed, using available data');
          }
        }

        if (addressData && addressData.address) {
          const addr = addressData.address;

          // Extract and clean address components with better validation
          const houseNumber = addr.house_number || addr.building || '';
          const road = addr.road || addr.street || addr.pedestrian || addr.path || '';
          const suburb = addr.suburb || addr.neighbourhood || addr.quarter || addr.residential || '';
          const village = addr.village || addr.hamlet || '';
          const city = addr.city || addr.town || village || addr.municipality || addr.county || '';
          const state = addr.state || addr.province || addr.region || '';
          const postcode = addr.postcode || addr.postal_code || '';


          // Cross-validate with BigDataCloud data for better accuracy
          let finalPostcode = postcode;
          let finalCity = city;
          let finalState = state;

          if (bigDataAddress) {
            // Use BigDataCloud postcode if Nominatim doesn't have it or if it's more specific
            if (!postcode && bigDataAddress.postcode) {
              finalPostcode = bigDataAddress.postcode;
            }

            // Cross-validate city names
            if (!city && bigDataAddress.city) {
              finalCity = bigDataAddress.city;
            }

            // Cross-validate state
            if (!state && bigDataAddress.principalSubdivision) {
              finalState = bigDataAddress.principalSubdivision;
            }
          }

          // Build more accurate street address
          let streetAddress = '';

          // Start with house number if available and valid
          if (houseNumber && houseNumber !== 'undefined' && houseNumber.trim() && !houseNumber.includes('null')) {
            streetAddress += houseNumber.trim() + ' ';
          }

          // Add road/street name if available and meaningful
          if (road && road !== 'undefined' && road.trim() && !road.includes('null') && road.length > 2) {
            streetAddress += road.trim();
          }

          // Add suburb/area if it's meaningful and different from road
          if (suburb && suburb !== 'undefined' && suburb.trim() && !suburb.includes('null') &&
              suburb !== road && suburb.length > 2 &&
              !streetAddress.toLowerCase().includes(suburb.toLowerCase())) {
            streetAddress += (streetAddress ? ', ' : '') + suburb.trim();
          }

          // If we still don't have a good street address, try to build one from available data
          if (!streetAddress.trim() || streetAddress.trim().length < 3) {
            // Try to use more specific location data
            const landmark = addr.amenity || addr.shop || addr.office || addr.building || '';
            const area = suburb || village || addr.locality || '';

            if (landmark && landmark.length > 2) {
              streetAddress = landmark;
              if (area && area !== landmark) {
                streetAddress += ', ' + area;
              }
            } else if (area && area.length > 2) {
              streetAddress = area;
            } else {
              // Only as last resort, and make it clear it needs to be updated
              streetAddress = 'Please enter your street address';
            }
          }

          // Validate postcode format for India (6 digits)
          if (finalPostcode && !/^\d{6}$/.test(finalPostcode.toString())) {
            console.log('Invalid postcode format:', finalPostcode);
            finalPostcode = ''; // Clear invalid postcode
          }

          // Don't use generic city names
          const genericCityNames = ['please enter', 'near', 'unknown', 'null', 'undefined'];
          if (finalCity && genericCityNames.some(generic => finalCity.toLowerCase().includes(generic))) {
            finalCity = '';
          }

          const newAddress = {
            street: streetAddress.trim() || '',
            city: finalCity || '',
            state: finalState || '',
            pincode: finalPostcode || '',
            coordinates: {
              latitude,
              longitude
            }
          };

          onChange(newAddress);
          setLocationDetected(true);
          closeLoading();

          // Provide user feedback based on data quality
          if (finalCity && finalState && finalPostcode && (streetAddress.trim() && !streetAddress.includes('Please enter'))) {
            console.log('✅ Location successfully detected with complete address details');
          } else if (finalCity && finalState) {
            console.log('⚠️ Location detected with partial address details - please verify pincode');
          } else {
            console.log('📍 Location coordinates detected - please complete address manually');
          }
        } else {
          throw new Error('No address data available');
        }
      } catch (geocodeError) {
        console.error('All geocoding services failed:', geocodeError);

        // Fallback: Set coordinates and provide helpful placeholders
        const newAddress = {
          street: 'Please enter your street address',
          city: 'Please enter your city',
          state: 'Please enter your state',
          pincode: '',
          coordinates: {
            latitude,
            longitude
          }
        };

        onChange(newAddress);
        setLocationDetected(true); // Set to true so user knows location was detected
        closeLoading();

        // Show user-friendly message with better guidance
        showError(
          'Address Details Needed',
          'Your location was detected, but we need you to fill in the address details manually for accuracy.'
        );
      }
    } catch (error) {
      closeLoading();
      let errorMessage = 'Unable to get your location. ';
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage += 'Please allow location access and try again.';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage += 'Location information is unavailable.';
          break;
        case error.TIMEOUT:
          errorMessage += 'Location request timed out.';
          break;
        default:
          errorMessage += 'Please enter your address manually.';
      }
      
      showError('Location Error', errorMessage);
    } finally {
      setIsGettingLocation(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Address Header with Get Location Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-900">Address Information</h3>
          {locationDetected && (
            <div className="flex items-center space-x-1 text-green-600 text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">
                {address.city && address.state ? 'Auto-filled' : 'Location detected'}
              </span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={getCurrentLocation}
          disabled={isGettingLocation}
          className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none shadow-lg"
        >
          <MapPinIcon className={`w-5 h-5 ${isGettingLocation ? 'animate-spin' : ''}`} />
          <span>{isGettingLocation ? 'Detecting Location...' : 'Auto-Fill Address'}</span>
        </button>
      </div>



      {/* Address Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <FormInput
            label="Street Address"
            name="street"
            type="text"
            value={address.street || ''}
            onChange={(e) => handleAddressChange('street', e.target.value)}
            placeholder="Enter your street address"
            error={errors.street}
          />
        </div>

        <FormInput
          label="City"
          name="city"
          type="text"
          value={address.city || ''}
          onChange={(e) => handleAddressChange('city', e.target.value)}
          placeholder="Enter your city"
          error={errors.city}
        />

        <FormInput
          label="State"
          name="state"
          type="text"
          value={address.state || ''}
          onChange={(e) => handleAddressChange('state', e.target.value)}
          placeholder="Enter your state"
          error={errors.state}
        />

        <div className="relative">
          <FormInput
            label="PIN Code"
            name="pincode"
            type="text"
            value={address.pincode || ''}
            onChange={(e) => handleAddressChange('pincode', e.target.value)}
            placeholder="Enter 6-digit PIN code"
            error={errors.pincode}
          />
          {pincodeValidated && address.pincode && (
            <div className="mt-1 flex items-center space-x-1 text-green-400 text-xs">
              <span>✅</span>
              <span>PIN code validated</span>
            </div>
          )}
        </div>
      </div>

      {/* Address Validation Errors */}
      <AnimatePresence>
        {(errors.address || errors.coordinates) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200"
          >
            <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
            <span>{errors.address || errors.coordinates}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AddressInput;

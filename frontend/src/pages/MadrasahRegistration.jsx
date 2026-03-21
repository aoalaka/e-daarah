import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { authService } from '../services/auth.service';
import SEO from '../components/SEO';
import './MadrasahRegistration.css';

function MadrasahRegistration() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    madrasahName: '',
    slug: '',
    institutionType: searchParams.get('type') || '',
    website: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
    phoneCountryCode: '+64',
    phone: '',
    street: '',
    city: '',
    region: '',
    country: '',
    agreeToTerms: false
  });

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    setFormData(prev => ({
      ...prev,
      madrasahName: name,
      slug: generateSlug(name)
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.adminPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.adminPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (!formData.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formData.slug)) {
      toast.error('Invalid URL format. Use lowercase letters, numbers, and hyphens only.');
      return;
    }

    if (!formData.phone || formData.phone.trim() === '') {
      toast.error('Phone number is required');
      return;
    }

    if (!formData.street || !formData.city || !formData.region || !formData.country) {
      toast.error('All address fields are required');
      return;
    }

    if (!formData.institutionType) {
      toast.error('Please select an institution type');
      return;
    }

    if (!formData.agreeToTerms) {
      toast.error('You must agree to the Terms of Service');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.registerMadrasah({
        madrasahName: formData.madrasahName,
        slug: formData.slug,
        institutionType: formData.institutionType,
        website: formData.website || null,
        adminFirstName: formData.adminFirstName,
        adminLastName: formData.adminLastName,
        adminEmail: formData.adminEmail,
        adminPassword: formData.adminPassword,
        phoneCountryCode: formData.phoneCountryCode,
        phone: formData.phone,
        street: formData.street,
        city: formData.city,
        region: formData.region,
        country: formData.country
      });

      toast.success('Madrasah registered successfully');
      if (response.madrasah.pricingPlan === 'free') {
        navigate(`/${response.madrasah.slug}/solo`);
      } else {
        navigate(`/${response.madrasah.slug}/admin`);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <SEO
        title="Register Your School — E-Daarah"
        description="Set up your madrasah on E-Daarah in minutes. 14-day free trial, no credit card required. Manage attendance, exams, and parent communication."
      />
      <div className="register-container">
        <div className="register-header">
          <Link to="/" className="register-logo">
            <img src="/e-daarah-whitebg-logo.png" alt="E-Daarah" className="register-logo-img" />
            <span className="register-logo-text">E-Daarah</span>
          </Link>
          <h1 className="register-title">Register Your Madrasah</h1>
          <p className="register-subtitle">Start managing your Islamic school today</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          {/* Madrasah Details Section */}
          <div className="register-section">
            <h3 className="register-section-title">Madrasah Details</h3>
            <div className="register-grid">
              <div className="register-field full-width">
                <label htmlFor="madrasahName">Madrasah Name</label>
                <input
                  id="madrasahName"
                  name="madrasahName"
                  type="text"
                  value={formData.madrasahName}
                  onChange={handleNameChange}
                  placeholder="e.g., Al-Noor Islamic Academy"
                  required
                />
              </div>

              <div className="register-field full-width">
                <label htmlFor="slug">Your URL</label>
                <div className="url-input-group">
                  <span className="url-prefix">e-daarah.com/</span>
                  <input
                    id="slug"
                    name="slug"
                    type="text"
                    value={formData.slug}
                    onChange={handleChange}
                    placeholder="al-noor"
                    required
                  />
                </div>
                <p className="register-help">This will be your madrasah's unique URL</p>
              </div>

              <div className="register-field full-width">
                <label htmlFor="institutionType">Institution Type</label>
                <select
                  id="institutionType"
                  name="institutionType"
                  value={formData.institutionType}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select institution type</option>
                  <option value="quran_focused">Qur'an-Focused (Hifdh / Tilawah)</option>
                  <option value="mosque_based">Mosque-based Madrasah</option>
                  <option value="independent">Independent Islamic School</option>
                  <option value="school_affiliated">School-affiliated Program</option>
                  <option value="online">Online Madrasah</option>
                  <option value="other">Other</option>
                </select>
                {formData.institutionType === 'quran_focused' && (
                  <p className="register-help" style={{ color: 'var(--success, #2d6a4f)', fontWeight: 500 }}>
                    Free plan — up to 75 students, Qur'an tracking only. No trial, no expiry.
                  </p>
                )}
              </div>

              <div className="register-field full-width">
                <label htmlFor="website">Website <span className="optional">(optional)</span></label>
                <input
                  id="website"
                  name="website"
                  type="url"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://yourmosque.org"
                />
                <p className="register-help">Your mosque or school website, if you have one</p>
              </div>

              <div className="register-field full-width">
                <label htmlFor="phone">Phone</label>
                <div className="phone-input-group">
                  <select
                    name="phoneCountryCode"
                    value={formData.phoneCountryCode}
                    onChange={handleChange}
                    required
                  >
                    <option value="+93">🇦🇫 +93 Afghanistan</option>
                    <option value="+355">🇦🇱 +355 Albania</option>
                    <option value="+213">🇩🇿 +213 Algeria</option>
                    <option value="+376">🇦🇩 +376 Andorra</option>
                    <option value="+244">🇦🇴 +244 Angola</option>
                    <option value="+54">🇦🇷 +54 Argentina</option>
                    <option value="+61">🇦🇺 +61 Australia</option>
                    <option value="+43">🇦🇹 +43 Austria</option>
                    <option value="+994">🇦🇿 +994 Azerbaijan</option>
                    <option value="+973">🇧🇭 +973 Bahrain</option>
                    <option value="+880">🇧🇩 +880 Bangladesh</option>
                    <option value="+375">🇧🇾 +375 Belarus</option>
                    <option value="+32">🇧🇪 +32 Belgium</option>
                    <option value="+501">🇧🇿 +501 Belize</option>
                    <option value="+229">🇧🇯 +229 Benin</option>
                    <option value="+975">🇧🇹 +975 Bhutan</option>
                    <option value="+591">🇧🇴 +591 Bolivia</option>
                    <option value="+387">🇧🇦 +387 Bosnia</option>
                    <option value="+267">🇧🇼 +267 Botswana</option>
                    <option value="+55">🇧🇷 +55 Brazil</option>
                    <option value="+673">🇧🇳 +673 Brunei</option>
                    <option value="+359">🇧🇬 +359 Bulgaria</option>
                    <option value="+226">🇧🇫 +226 Burkina Faso</option>
                    <option value="+257">🇧🇮 +257 Burundi</option>
                    <option value="+855">🇰🇭 +855 Cambodia</option>
                    <option value="+237">🇨🇲 +237 Cameroon</option>
                    <option value="+1">🇨🇦 +1 Canada</option>
                    <option value="+236">🇨🇫 +236 Central African Republic</option>
                    <option value="+235">🇹🇩 +235 Chad</option>
                    <option value="+56">🇨🇱 +56 Chile</option>
                    <option value="+86">🇨🇳 +86 China</option>
                    <option value="+57">🇨🇴 +57 Colombia</option>
                    <option value="+269">🇰🇲 +269 Comoros</option>
                    <option value="+506">🇨🇷 +506 Costa Rica</option>
                    <option value="+385">🇭🇷 +385 Croatia</option>
                    <option value="+53">🇨🇺 +53 Cuba</option>
                    <option value="+357">🇨🇾 +357 Cyprus</option>
                    <option value="+420">🇨🇿 +420 Czech Republic</option>
                    <option value="+45">🇩🇰 +45 Denmark</option>
                    <option value="+253">🇩🇯 +253 Djibouti</option>
                    <option value="+593">🇪🇨 +593 Ecuador</option>
                    <option value="+20">🇪🇬 +20 Egypt</option>
                    <option value="+503">🇸🇻 +503 El Salvador</option>
                    <option value="+240">🇬🇶 +240 Equatorial Guinea</option>
                    <option value="+291">🇪🇷 +291 Eritrea</option>
                    <option value="+372">🇪🇪 +372 Estonia</option>
                    <option value="+251">🇪🇹 +251 Ethiopia</option>
                    <option value="+679">🇫🇯 +679 Fiji</option>
                    <option value="+358">🇫🇮 +358 Finland</option>
                    <option value="+33">🇫🇷 +33 France</option>
                    <option value="+241">🇬🇦 +241 Gabon</option>
                    <option value="+220">🇬🇲 +220 Gambia</option>
                    <option value="+995">🇬🇪 +995 Georgia</option>
                    <option value="+49">🇩🇪 +49 Germany</option>
                    <option value="+233">🇬🇭 +233 Ghana</option>
                    <option value="+30">🇬🇷 +30 Greece</option>
                    <option value="+502">🇬🇹 +502 Guatemala</option>
                    <option value="+224">🇬🇳 +224 Guinea</option>
                    <option value="+245">🇬🇼 +245 Guinea-Bissau</option>
                    <option value="+592">🇬🇾 +592 Guyana</option>
                    <option value="+509">🇭🇹 +509 Haiti</option>
                    <option value="+504">🇭🇳 +504 Honduras</option>
                    <option value="+36">🇭🇺 +36 Hungary</option>
                    <option value="+354">🇮🇸 +354 Iceland</option>
                    <option value="+91">🇮🇳 +91 India</option>
                    <option value="+62">🇮🇩 +62 Indonesia</option>
                    <option value="+98">🇮🇷 +98 Iran</option>
                    <option value="+964">🇮🇶 +964 Iraq</option>
                    <option value="+353">🇮🇪 +353 Ireland</option>
                    <option value="+972">🇮🇱 +972 Israel</option>
                    <option value="+39">🇮🇹 +39 Italy</option>
                    <option value="+225">🇨🇮 +225 Ivory Coast</option>
                    <option value="+81">🇯🇵 +81 Japan</option>
                    <option value="+962">🇯🇴 +962 Jordan</option>
                    <option value="+7">🇰🇿 +7 Kazakhstan</option>
                    <option value="+254">🇰🇪 +254 Kenya</option>
                    <option value="+965">🇰🇼 +965 Kuwait</option>
                    <option value="+996">🇰🇬 +996 Kyrgyzstan</option>
                    <option value="+856">🇱🇦 +856 Laos</option>
                    <option value="+371">🇱🇻 +371 Latvia</option>
                    <option value="+961">🇱🇧 +961 Lebanon</option>
                    <option value="+266">🇱🇸 +266 Lesotho</option>
                    <option value="+231">🇱🇷 +231 Liberia</option>
                    <option value="+218">🇱🇾 +218 Libya</option>
                    <option value="+423">🇱🇮 +423 Liechtenstein</option>
                    <option value="+370">🇱🇹 +370 Lithuania</option>
                    <option value="+352">🇱🇺 +352 Luxembourg</option>
                    <option value="+261">🇲🇬 +261 Madagascar</option>
                    <option value="+265">🇲🇼 +265 Malawi</option>
                    <option value="+60">🇲🇾 +60 Malaysia</option>
                    <option value="+960">🇲🇻 +960 Maldives</option>
                    <option value="+223">🇲🇱 +223 Mali</option>
                    <option value="+356">🇲🇹 +356 Malta</option>
                    <option value="+222">🇲🇷 +222 Mauritania</option>
                    <option value="+230">🇲🇺 +230 Mauritius</option>
                    <option value="+52">🇲🇽 +52 Mexico</option>
                    <option value="+373">🇲🇩 +373 Moldova</option>
                    <option value="+377">🇲🇨 +377 Monaco</option>
                    <option value="+976">🇲🇳 +976 Mongolia</option>
                    <option value="+382">🇲🇪 +382 Montenegro</option>
                    <option value="+212">🇲🇦 +212 Morocco</option>
                    <option value="+258">🇲🇿 +258 Mozambique</option>
                    <option value="+95">🇲🇲 +95 Myanmar</option>
                    <option value="+264">🇳🇦 +264 Namibia</option>
                    <option value="+977">🇳🇵 +977 Nepal</option>
                    <option value="+31">🇳🇱 +31 Netherlands</option>
                    <option value="+64">🇳🇿 +64 New Zealand</option>
                    <option value="+505">🇳🇮 +505 Nicaragua</option>
                    <option value="+227">🇳🇪 +227 Niger</option>
                    <option value="+234">🇳🇬 +234 Nigeria</option>
                    <option value="+850">🇰🇵 +850 North Korea</option>
                    <option value="+389">🇲🇰 +389 North Macedonia</option>
                    <option value="+47">🇳🇴 +47 Norway</option>
                    <option value="+968">🇴🇲 +968 Oman</option>
                    <option value="+92">🇵🇰 +92 Pakistan</option>
                    <option value="+970">🇵🇸 +970 Palestine</option>
                    <option value="+507">🇵🇦 +507 Panama</option>
                    <option value="+675">🇵🇬 +675 Papua New Guinea</option>
                    <option value="+595">🇵🇾 +595 Paraguay</option>
                    <option value="+51">🇵🇪 +51 Peru</option>
                    <option value="+63">🇵🇭 +63 Philippines</option>
                    <option value="+48">🇵🇱 +48 Poland</option>
                    <option value="+351">🇵🇹 +351 Portugal</option>
                    <option value="+974">🇶🇦 +974 Qatar</option>
                    <option value="+40">🇷🇴 +40 Romania</option>
                    <option value="+7">🇷🇺 +7 Russia</option>
                    <option value="+250">🇷🇼 +250 Rwanda</option>
                    <option value="+966">🇸🇦 +966 Saudi Arabia</option>
                    <option value="+221">🇸🇳 +221 Senegal</option>
                    <option value="+381">🇷🇸 +381 Serbia</option>
                    <option value="+248">🇸🇨 +248 Seychelles</option>
                    <option value="+232">🇸🇱 +232 Sierra Leone</option>
                    <option value="+65">🇸🇬 +65 Singapore</option>
                    <option value="+421">🇸🇰 +421 Slovakia</option>
                    <option value="+386">🇸🇮 +386 Slovenia</option>
                    <option value="+252">🇸🇴 +252 Somalia</option>
                    <option value="+27">🇿🇦 +27 South Africa</option>
                    <option value="+82">🇰🇷 +82 South Korea</option>
                    <option value="+211">🇸🇸 +211 South Sudan</option>
                    <option value="+34">🇪🇸 +34 Spain</option>
                    <option value="+94">🇱🇰 +94 Sri Lanka</option>
                    <option value="+249">🇸🇩 +249 Sudan</option>
                    <option value="+597">🇸🇷 +597 Suriname</option>
                    <option value="+46">🇸🇪 +46 Sweden</option>
                    <option value="+41">🇨🇭 +41 Switzerland</option>
                    <option value="+963">🇸🇾 +963 Syria</option>
                    <option value="+886">🇹🇼 +886 Taiwan</option>
                    <option value="+992">🇹🇯 +992 Tajikistan</option>
                    <option value="+255">🇹🇿 +255 Tanzania</option>
                    <option value="+66">🇹🇭 +66 Thailand</option>
                    <option value="+228">🇹🇬 +228 Togo</option>
                    <option value="+676">🇹🇴 +676 Tonga</option>
                    <option value="+216">🇹🇳 +216 Tunisia</option>
                    <option value="+90">🇹🇷 +90 Turkey</option>
                    <option value="+993">🇹🇲 +993 Turkmenistan</option>
                    <option value="+256">🇺🇬 +256 Uganda</option>
                    <option value="+380">🇺🇦 +380 Ukraine</option>
                    <option value="+971">🇦🇪 +971 United Arab Emirates</option>
                    <option value="+44">🇬🇧 +44 United Kingdom</option>
                    <option value="+1">🇺🇸 +1 United States</option>
                    <option value="+598">🇺🇾 +598 Uruguay</option>
                    <option value="+998">🇺🇿 +998 Uzbekistan</option>
                    <option value="+58">🇻🇪 +58 Venezuela</option>
                    <option value="+84">🇻🇳 +84 Vietnam</option>
                    <option value="+967">🇾🇪 +967 Yemen</option>
                    <option value="+260">🇿🇲 +260 Zambia</option>
                    <option value="+263">🇿🇼 +263 Zimbabwe</option>
                  </select>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Phone number"
                    required
                  />
                </div>
              </div>

              <div className="register-field full-width">
                <label htmlFor="street">Street Address</label>
                <input
                  id="street"
                  name="street"
                  type="text"
                  value={formData.street}
                  onChange={handleChange}
                  placeholder="Street address"
                  required
                />
              </div>

              <div className="register-field">
                <label htmlFor="city">City</label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="City"
                  required
                />
              </div>

              <div className="register-field">
                <label htmlFor="region">Region/State</label>
                <input
                  id="region"
                  name="region"
                  type="text"
                  value={formData.region}
                  onChange={handleChange}
                  placeholder="Region or State"
                  required
                />
              </div>

              <div className="register-field full-width">
                <label htmlFor="country">Country</label>
                <input
                  id="country"
                  name="country"
                  type="text"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="Country"
                  required
                />
              </div>
            </div>
          </div>

          {/* Admin Account Section */}
          <div className="register-section">
            <h3 className="register-section-title">Admin Account</h3>
            <div className="register-grid">
              <div className="register-field">
                <label htmlFor="adminFirstName">First Name</label>
                <input
                  id="adminFirstName"
                  name="adminFirstName"
                  type="text"
                  value={formData.adminFirstName}
                  onChange={handleChange}
                  placeholder="First name"
                  required
                />
              </div>

              <div className="register-field">
                <label htmlFor="adminLastName">Last Name</label>
                <input
                  id="adminLastName"
                  name="adminLastName"
                  type="text"
                  value={formData.adminLastName}
                  onChange={handleChange}
                  placeholder="Last name"
                  required
                />
              </div>

              <div className="register-field full-width">
                <label htmlFor="adminEmail">Email</label>
                <input
                  id="adminEmail"
                  name="adminEmail"
                  type="email"
                  value={formData.adminEmail}
                  onChange={handleChange}
                  placeholder="admin@example.com"
                  required
                />
              </div>

              <div className="register-field">
                <label htmlFor="adminPassword">Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="adminPassword"
                    name="adminPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.adminPassword}
                    onChange={handleChange}
                    placeholder="Minimum 8 characters"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '◠' : '◡'}
                  </button>
                </div>
              </div>

              <div className="register-field">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? '◠' : '◡'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="register-section">
            <div className="register-checkbox">
              <input
                type="checkbox"
                id="agreeToTerms"
                name="agreeToTerms"
                checked={formData.agreeToTerms}
                onChange={(e) => setFormData(prev => ({ ...prev, agreeToTerms: e.target.checked }))}
                required
              />
              <label htmlFor="agreeToTerms">
                I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
              </label>
            </div>
          </div>

          <button type="submit" className="register-submit" disabled={loading || !formData.agreeToTerms}>
            {loading ? 'Creating...' : 'Create Madrasah'}
          </button>
        </form>

        <div className="register-footer">
          <p>Already have a madrasah? <Link to="/">Find it here</Link></p>
        </div>
      </div>
    </div>
  );
}

export default MadrasahRegistration;

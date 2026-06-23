import { useState, useEffect } from 'react'
import './index.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export default function App() {
  // Global States
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false)
  const [loginForm, setLoginForm] = useState({ email: 'admin@caterhub.com', password: '' })
  const [loginError, setLoginError] = useState('')
  
  const [caterers, setCaterers] = useState([])
  const [loading, setLoading] = useState(false)
  const [alert, setAlert] = useState({ text: '', type: '' }) // type: 'success' | 'error'
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modals & Context States
  const [showAddModal, setShowAddModal] = useState(false)
  const [newCatererForm, setNewCatererForm] = useState({
    business_name: '',
    owner_name: '',
    email: '',
    mobile: '',
    password: 'password123',
    address: '',
    city: '',
    state: '',
    zip: '',
    cuisine_type: 'North Indian',
    bio: '',
    price_per_guest: '',
    image_url: ''
  })
  
  // Managing Context for a Specific Caterer
  const [activeCaterer, setActiveCaterer] = useState(null) // Caterer object currently being managed
  const [activeToken, setActiveToken] = useState('') // JWT token for the managed caterer
  const [manageTab, setManageTab] = useState('profile')
  const [passwordPrompt, setPasswordPrompt] = useState(null) // { email, callback } if default password123 fails
  const [promptPasswordVal, setPromptPasswordVal] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // Bulk Upload States
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkJson, setBulkJson] = useState('')
  const [bulkResult, setBulkResult] = useState(null)
  
  // Context-specific lists
  const [profileForm, setProfileForm] = useState({})
  const [licenses, setLicenses] = useState([])
  const [certifications, setCertifications] = useState([])
  const [awards, setAwards] = useState([])
  const [gallery, setGallery] = useState([])
  const [reviews, setReviews] = useState([])
  
  // Context-specific form states
  const [newLicense, setNewLicense] = useState({ title: '', description: '', document_url: '', expiry_date: '' })
  const [newCert, setNewCert] = useState({ title: '', issued_by: '', certificate_url: '', issue_date: '' })
  const [newAward, setNewAward] = useState({ title: '', year: '', description: '', image_url: '' })
  const [newPhoto, setNewPhoto] = useState({ file_url: '', type: 'photo' })
  
  const apiUrl = API_BASE_URL.replace(/\/$/, '')

  const showAlert = (text, type = 'success') => {
    setAlert({ text, type })
    setTimeout(() => setAlert({ text: '', type: '' }), 5000)
  }

  // Fetch all caterers on load
  const fetchCaterers = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/api/v1/caterers/`)
      if (!res.ok) throw new Error('Failed to load caterers list')
      const data = await res.json()
      setCaterers(data)
    } catch (err) {
      showAlert(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdminLoggedIn) {
      fetchCaterers()
    }
  }, [isAdminLoggedIn])

  // Handle Admin Auth
  const handleAdminLogin = (e) => {
    e.preventDefault()
    if (loginForm.email === 'admin@caterhub.com' && loginForm.password === 'admin123') {
      setIsAdminLoggedIn(true)
      localStorage.setItem('admin_logged_in', 'true')
    } else {
      setLoginError('Invalid Administrator credentials.')
    }
  }

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false)
    setActiveCaterer(null)
    setActiveToken('')
    localStorage.removeItem('admin_logged_in')
  }

  // Auto-login from localStorage if previously authorized
  useEffect(() => {
    const isLogged = localStorage.getItem('admin_logged_in')
    if (isLogged === 'true') {
      setIsAdminLoggedIn(true)
    }
  }, [])

  // Toggle Verification status of any caterer
  const toggleVerification = async (caterer) => {
    setLoading(true)
    try {
      const payload = { verified: !caterer.verified }
      const res = await fetch(`${apiUrl}/api/v1/caterers/${caterer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Failed to update verification status')
      showAlert(`Successfully updated verification badge for ${caterer.business_name}!`)
      fetchCaterers()
    } catch (err) {
      showAlert(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Delete a caterer
  const deleteCaterer = async (catererId, name) => {
    if (!confirm(`Are you absolutely sure you want to delete "${name}"? This removes all their licenses, certifications, awards, photos, and reviews permanently!`)) return
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/api/v1/caterers/${catererId}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to delete caterer')
      showAlert(`Successfully deleted ${name} from the platform.`)
      // If we are currently managing this caterer, exit context
      if (activeCaterer && activeCaterer.id === catererId) {
        setActiveCaterer(null)
        setActiveToken('')
      }
      fetchCaterers()
    } catch (err) {
      showAlert(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Register New Caterer (Admin Mode)
  const handleRegisterCaterer = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...newCatererForm,
        price_per_guest: newCatererForm.price_per_guest ? Number(newCatererForm.price_per_guest) : null,
        service_tags: ['Weddings', 'Corporate'] // Defaults
      }
      const res = await fetch(`${apiUrl}/api/v1/caterers/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'Registration failed')
      }
      showAlert(`Successfully registered ${newCatererForm.business_name}!`)
      setShowAddModal(false)
      setNewCatererForm({
        business_name: '',
        owner_name: '',
        email: '',
        mobile: '',
        password: 'password123',
        address: '',
        city: '',
        state: '',
        zip: '',
        cuisine_type: 'North Indian',
        bio: '',
        price_per_guest: '',
        image_url: ''
      })
      fetchCaterers()
    } catch (err) {
      showAlert(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Handle local file upload to backend
  const handleFileUpload = async (file, onUploadSuccess) => {
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/api/v1/upload`, {
        method: 'POST',
        body: formData
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail || 'File upload failed')
      }
      const data = await res.json()
      const absoluteUrl = `${apiUrl}${data.file_url}`
      onUploadSuccess(absoluteUrl)
      showAlert('File uploaded successfully!')
    } catch (err) {
      showAlert(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Bulk Upload Handler
  const handleBulkUpload = async (e) => {
    e.preventDefault()
    setLoading(true)
    setBulkResult(null)
    try {
      let parsed
      try {
        parsed = JSON.parse(bulkJson)
      } catch (err) {
        throw new Error('Invalid JSON format. Please check your syntax.')
      }

      if (!Array.isArray(parsed)) {
        throw new Error('JSON must be an array of caterer objects.')
      }

      const res = await fetch(`${apiUrl}/api/v1/caterers/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.detail || 'Bulk upload failed')
      }

      const data = await res.json()
      setBulkResult(data)
      showAlert(`Bulk upload completed! Created: ${data.created_count}, Failed: ${data.failed_count}`)
      fetchCaterers()
    } catch (err) {
      showAlert(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Enter Caterer Context Manager
  const selectCatererContext = async (caterer, customPass = null) => {
    setLoading(true)
    setPasswordError('')
    const password = customPass || 'password123'
    try {
      // 1. Authenticate in background to get authorization token
      const res = await fetch(`${apiUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: caterer.email, password })
      })
      
      if (!res.ok) {
        // Auth failed (likely they changed their password). Prompt for it.
        if (customPass) {
          setPasswordError('Invalid vendor password. Please try again.')
        } else {
          setPasswordPrompt({
            email: caterer.email,
            caterer,
            callback: (enteredPass) => selectCatererContext(caterer, enteredPass)
          })
        }
        setLoading(false)
        return
      }

      const data = await res.json()
      setActiveCaterer(caterer)
      setActiveToken(data.access_token)
      setPasswordPrompt(null)
      setPasswordError('')
      setPromptPasswordVal('')
      setManageTab('profile')
      
      // 2. Fetch context lists
      fetchContextData(caterer.id, data.access_token)
    } catch (err) {
      showAlert(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchContextData = async (catererId, token) => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` }
      
      // Refresh active profile details
      const profileRes = await fetch(`${apiUrl}/api/v1/caterers/${catererId}`)
      if (profileRes.ok) {
        const data = await profileRes.json()
        setProfileForm({
          business_name: data.business_name || '',
          owner_name: data.owner_name || '',
          mobile: data.mobile || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zip: data.zip || '',
          cuisine_type: data.cuisine_type || '',
          bio: data.bio || '',
          price_per_guest: data.price_per_guest || '',
          service_tags: (data.tags || []).join(', '),
          image_url: data.image_url || '',
          verified: data.verified
        })
      }

      // Licenses
      const licRes = await fetch(`${apiUrl}/api/v1/licenses/?caterer_id=${catererId}`)
      if (licRes.ok) setLicenses(await licRes.json())

      // Certifications
      const certRes = await fetch(`${apiUrl}/api/v1/certifications/?caterer_id=${catererId}`)
      if (certRes.ok) setCertifications(await certRes.json())

      // Awards
      const awardRes = await fetch(`${apiUrl}/api/v1/awards/?caterer_id=${catererId}`)
      if (awardRes.ok) setAwards(await awardRes.json())

      // Gallery
      const galRes = await fetch(`${apiUrl}/api/v1/gallery/?caterer_id=${catererId}`)
      if (galRes.ok) setGallery(await galRes.json())

      // Reviews
      const revRes = await fetch(`${apiUrl}/api/v1/reviews/?caterer_id=${catererId}`)
      if (revRes.ok) setReviews(await revRes.json())

    } catch (err) {
      console.error(err)
      showAlert('Error loading caterer sub-management lists.', 'error')
    }
  }

  // Context: Save profile changes
  const saveContextProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      let imageUrl = profileForm.image_url
      if (imageUrl) {
        const urlRegex = /https?:\/\/[^\s'",\]]+[^\s'",\]\.]/g;
        const urls = imageUrl.match(urlRegex) || [];
        if (urls.length > 0) {
          imageUrl = urls[0]
        }
      }
      const payload = {
        ...profileForm,
        image_url: imageUrl,
        price_per_guest: profileForm.price_per_guest ? Number(profileForm.price_per_guest) : null,
        service_tags: profileForm.service_tags.split(',').map(t => t.trim()).filter(Boolean)
      }
      const res = await fetch(`${apiUrl}/api/v1/caterers/${activeCaterer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Update profile failed')
      const updated = await res.json()
      setActiveCaterer(updated)
      showAlert('Caterer profile details updated successfully!')
      fetchCaterers()
    } catch (err) {
      showAlert(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Context: Licenses CRUD
  const handleAddLicense = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...newLicense,
        expiry_date: newLicense.expiry_date ? new Date(newLicense.expiry_date).toISOString() : null
      }
      const res = await fetch(`${apiUrl}/api/v1/licenses/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Failed to create license')
      showAlert('New license added successfully!')
      setNewLicense({ title: '', description: '', document_url: '', expiry_date: '' })
      fetchContextData(activeCaterer.id, activeToken)
    } catch (err) {
      showAlert(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLicense = async (id) => {
    if (!confirm('Are you sure you want to delete this license record?')) return
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/api/v1/licenses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${activeToken}` }
      })
      if (!res.ok) throw new Error('Delete failed')
      showAlert('License deleted.')
      fetchContextData(activeCaterer.id, activeToken)
    } catch (err) {
      showAlert(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Context: Certifications CRUD
  const handleAddCert = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...newCert,
        issue_date: newCert.issue_date ? new Date(newCert.issue_date).toISOString() : null
      }
      const res = await fetch(`${apiUrl}/api/v1/certifications/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Failed to create certification')
      showAlert('New certification added!')
      setNewCert({ title: '', issued_by: '', certificate_url: '', issue_date: '' })
      fetchContextData(activeCaterer.id, activeToken)
    } catch (err) {
      showAlert(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCert = async (id) => {
    if (!confirm('Delete this certification record?')) return
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/api/v1/certifications/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${activeToken}` }
      })
      if (!res.ok) throw new Error('Delete failed')
      showAlert('Certification deleted.')
      fetchContextData(activeCaterer.id, activeToken)
    } catch (err) {
      showAlert(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Context: Awards CRUD
  const handleAddAward = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      let imageUrl = newAward.image_url
      if (imageUrl) {
        const urlRegex = /https?:\/\/[^\s'",\]]+[^\s'",\]\.]/g;
        const urls = imageUrl.match(urlRegex) || [];
        if (urls.length > 0) {
          imageUrl = urls[0]
        }
      }
      const payload = {
        ...newAward,
        image_url: imageUrl,
        year: newAward.year ? Number(newAward.year) : null
      }
      const res = await fetch(`${apiUrl}/api/v1/awards/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Failed to add award')
      showAlert('Award credential added!')
      setNewAward({ title: '', year: '', description: '', image_url: '' })
      fetchContextData(activeCaterer.id, activeToken)
    } catch (err) {
      showAlert(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAward = async (id) => {
    if (!confirm('Delete this award credential?')) return
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/api/v1/awards/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${activeToken}` }
      })
      if (!res.ok) throw new Error('Delete failed')
      showAlert('Award credential deleted.')
      fetchContextData(activeCaterer.id, activeToken)
    } catch (err) {
      showAlert(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Context: Gallery CRUD
  const handleAddPhoto = async (e) => {
    e.preventDefault()
    if (!newPhoto.file_url) return
    setLoading(true)
    const urlRegex = /https?:\/\/[^\s'",\]]+[^\s'",\]\.]/g;
    const urls = newPhoto.file_url.match(urlRegex) || [];
    if (urls.length === 0) {
      showAlert('No valid image URLs found in input.', 'error')
      setLoading(false)
      return
    }
    try {
      let successCount = 0
      for (const url of urls) {
        const res = await fetch(`${apiUrl}/api/v1/gallery/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeToken}`
          },
          body: JSON.stringify({ ...newPhoto, file_url: url })
        })
        if (res.ok) {
          successCount++
        }
      }
      if (successCount > 0) {
        showAlert(`Successfully uploaded ${successCount} photo(s) to gallery!`)
      } else {
        throw new Error('Photo link upload failed')
      }
      setNewPhoto({ file_url: '', type: 'photo' })
      fetchContextData(activeCaterer.id, activeToken)
    } catch (err) {
      showAlert(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePhoto = async (id) => {
    if (!confirm('Delete this photo from their gallery?')) return
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/api/v1/gallery/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${activeToken}` }
      })
      if (!res.ok) throw new Error('Delete failed')
      showAlert('Photo deleted.')
      fetchContextData(activeCaterer.id, activeToken)
    } catch (err) {
      showAlert(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Context: Review Delete (re-calculates average rating)
  const handleDeleteReview = async (id) => {
    if (!confirm('Are you sure you want to delete this customer review? The platform rating for this caterer will automatically re-calculate.')) return
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/api/v1/reviews/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${activeToken}` }
      })
      if (!res.ok) throw new Error('Delete failed')
      showAlert('Review deleted.')
      fetchContextData(activeCaterer.id, activeToken)
      fetchCaterers() // refresh global ratings
    } catch (err) {
      showAlert(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Filter caterers list for directory
  const filteredCaterers = caterers.filter(c => 
    (c.business_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.owner_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.city || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.cuisine_type || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Compute Platform Metrics
  const totalCaterers = caterers.length
  const totalReviews = caterers.reduce((acc, c) => acc + (c.review_count || 0), 0)
  const verifiedCaterers = caterers.filter(c => c.verified).length
  const avgPrice = caterers.length 
    ? Math.round(caterers.reduce((acc, c) => acc + (c.price_per_guest || 0), 0) / caterers.length)
    : 0

  // 1. LOGIN SCREEN
  if (!isAdminLoggedIn) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-icon">💼</div>
          <h1>CaterHub Portal</h1>
          <p>Sign in with your administrative credentials to manage the platform registry.</p>
          
          <form onSubmit={handleAdminLogin} className="login-form">
            <div className="form-group">
              <label>Administrator Email</label>
              <input 
                type="email" 
                value={loginForm.email} 
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} 
                required 
              />
            </div>
            <div className="form-group">
              <label>Console Passphrase</label>
              <input 
                type="password" 
                placeholder="Enter admin passphrase" 
                value={loginForm.password} 
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} 
                required 
              />
            </div>
            
            {loginError && (
              <p style={{ color: '#fca5a5', fontSize: '0.875rem', marginTop: '-4px', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                ❌ {loginError}
              </p>
            )}

            <button type="submit" className="btn btn-primary" style={{ padding: '14px', width: '100%', marginTop: '8px', fontSize: '1rem' }}>
              Sign in to Console
            </button>

            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => {
                setIsAdminLoggedIn(true)
                localStorage.setItem('admin_logged_in', 'true')
              }}
              style={{ background: 'transparent', border: '1px dashed rgba(255,255,255,0.2)', color: '#94a3b8', padding: '12px' }}
            >
              Developer Quick Bypass (No Password)
            </button>
          </form>
        </div>
      </div>
    )
  }

  // 2. MAIN LAYOUT
  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-logo">🍽️</span>
          <span className="sidebar-title">CaterHub Admin</span>
        </div>

        <nav className="sidebar-menu">
          <div className="menu-subtitle">System Overview</div>
          <button 
            className={`menu-item ${!activeCaterer ? 'active' : ''}`}
            onClick={() => setActiveCaterer(null)}
          >
            📊 Platform Dashboard
          </button>

          {activeCaterer && (
            <>
              <div className="menu-separator"></div>
              <div className="menu-subtitle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Management Context</span>
                <button 
                  onClick={() => {
                    setActiveCaterer(null)
                    setActiveToken('')
                  }} 
                  style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Clear ✕
                </button>
              </div>
              <div style={{ padding: '0 16px 12px', fontSize: '0.85rem', color: '#ffffff', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                🏢 {activeCaterer.business_name}
              </div>

              {[
                { id: 'profile', label: '📊 Profile & Details' },
                { id: 'licenses', label: '🛡️ Licenses' },
                { id: 'certifications', label: '📜 Certifications' },
                { id: 'awards', label: '🏆 Awards & Recognition' },
                { id: 'gallery', label: '🖼️ Photos & Videos' },
                { id: 'reviews', label: `⭐ Customer Reviews (${reviews.length})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`menu-item ${manageTab === tab.id ? 'active' : ''}`}
                  onClick={() => setManageTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </>
          )}

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="menu-separator"></div>
            <button className="menu-item" onClick={handleAdminLogout} style={{ color: '#ef4444' }}>
              🚪 Log out
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Panel Content */}
      <main className="main-content">
        
        {/* Global Notifications */}
        {alert.text && (
          <div className={`alert alert-${alert.type === 'error' ? 'error' : 'success'}`}>
            <span>{alert.type === 'error' ? '❌' : '✨'} {alert.text}</span>
            <button onClick={() => setAlert({ text: '', type: '' })} style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 'bold', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {/* Password Prompt Modal for Context Change */}
        {passwordPrompt && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="card" style={{ width: '400px', padding: '24px' }}>
              <h3 style={{ marginBottom: '12px' }}>🔒 Enter Credentials</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '16px' }}>
                Auth as `{passwordPrompt.email}` failed. Enter their custom vendor password:
              </p>
              <input 
                type="password"
                className="form-group"
                placeholder="Vendor Password"
                value={promptPasswordVal}
                onChange={(e) => setPromptPasswordVal(e.target.value)}
                style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', width: '100%', marginBottom: '16px' }}
              />
              {passwordError && (
                <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '16px', marginTop: '-8px' }}>
                  ❌ {passwordError}
                </p>
              )}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => { setPasswordPrompt(null); setPasswordError(''); setPromptPasswordVal(''); }}>Cancel</button>
                <button className="btn btn-primary" onClick={() => passwordPrompt.callback(promptPasswordVal)}>Unlock Context</button>
              </div>
            </div>
          </div>
        )}

        {/* Global View: Dashboard */}
        {!activeCaterer ? (
          <>
            {/* Header info */}
            <div className="header-container">
              <div className="header-meta">
                <h1>Platform Registry Dashboard</h1>
                <p>Overview of active caterers, registrations, compliance, and user reviews.</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-secondary" onClick={() => setShowBulkModal(true)}>
                  📥 Bulk Upload Caterers
                </button>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                  ➕ Register New Caterer
                </button>
              </div>
            </div>

            {/* Platform metrics */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon-wrapper" style={{ background: '#e0e7ff', color: '#6366f1' }}>🏢</div>
                <div className="stat-info">
                  <span className="stat-label">Total Caterers</span>
                  <span className="stat-value">{totalCaterers}</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon-wrapper" style={{ background: '#d1fae5', color: '#10b981' }}>🛡️</div>
                <div className="stat-info">
                  <span className="stat-label">Verified Partners</span>
                  <span className="stat-value">{verifiedCaterers}</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon-wrapper" style={{ background: '#fef3c7', color: '#f59e0b' }}>⭐</div>
                <div className="stat-info">
                  <span className="stat-label">Total Reviews</span>
                  <span className="stat-value">{totalReviews}</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon-wrapper" style={{ background: '#fee2e2', color: '#ef4444' }}>₹</div>
                <div className="stat-info">
                  <span className="stat-label">Avg. Price / Plate</span>
                  <span className="stat-value">₹{avgPrice}</span>
                </div>
              </div>
            </div>

            {/* Caterer List Table */}
            <div className="card">
              <div className="card-header" style={{ borderBottom: 'none', marginBottom: '12px' }}>
                <h3 className="card-title">📖 Caterer Directory ({filteredCaterers.length})</h3>
                <div className="search-bar-container" style={{ marginBottom: 0 }}>
                  <input 
                    type="text" 
                    placeholder="Search name, owner, city or cuisine..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: '8px', minWidth: '280px' }}
                  />
                </div>
              </div>

              {loading && <div style={{ color: 'var(--text-secondary)', padding: '16px' }}>Loading directory database...</div>}

              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Business Profile</th>
                      <th>Owner / Contact</th>
                      <th>Cuisine</th>
                      <th>Pricing / Plate</th>
                      <th>Compliance</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCaterers.map(c => (
                      <tr key={c.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', background: '#f1f5f9' }}>
                              <img src={c.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1555244162-803834f70033?w=80' }} />
                            </div>
                            <div>
                              <strong style={{ fontSize: '0.95rem' }}>{c.business_name}</strong>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>📍 {c.city}, {c.state}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>{c.owner_name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.email}</div>
                        </td>
                        <td>
                          <span className="badge badge-info">{c.cuisine_type || 'General'}</span>
                        </td>
                        <td>
                          <strong>₹{c.price_per_guest || 'N/A'}</strong>
                        </td>
                        <td>
                          <button 
                            onClick={() => toggleVerification(c)}
                            className={`badge ${c.verified ? 'badge-success' : 'badge-muted'}`}
                            style={{ border: 'none', cursor: 'pointer' }}
                            title="Toggle verification badge"
                          >
                            {c.verified ? '🛡️ Verified' : '🔘 Pending'}
                          </button>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => selectCatererContext(c)}>
                              🛠️ Manage
                            </button>
                            <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => deleteCaterer(c.id, c.business_name)}>
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredCaterers.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                          No caterers found matching your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add Caterer Modal */}
            {showAddModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px', overflowY: 'auto' }}>
                <div className="card" style={{ width: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
                  <div className="card-header">
                    <h3 className="card-title">🏢 Register New Caterer Profile</h3>
                    <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
                  </div>
                  <form onSubmit={handleRegisterCaterer} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Business Name *</label>
                        <input type="text" placeholder="e.g. Royal Taj Catering" value={newCatererForm.business_name} onChange={e => setNewCatererForm({...newCatererForm, business_name: e.target.value})} required />
                      </div>
                      <div className="form-group">
                        <label>Owner Name *</label>
                        <input type="text" placeholder="e.g. Aarav Sharma" value={newCatererForm.owner_name} onChange={e => setNewCatererForm({...newCatererForm, owner_name: e.target.value})} required />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Email Address *</label>
                        <input type="email" placeholder="e.g. contact@business.com" value={newCatererForm.email} onChange={e => setNewCatererForm({...newCatererForm, email: e.target.value})} required />
                      </div>
                      <div className="form-group">
                        <label>Mobile Number</label>
                        <input type="text" placeholder="e.g. +91 98765 43210" value={newCatererForm.mobile} onChange={e => setNewCatererForm({...newCatererForm, mobile: e.target.value})} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Account Password *</label>
                        <input type="password" value={newCatererForm.password} onChange={e => setNewCatererForm({...newCatererForm, password: e.target.value})} required />
                      </div>
                      <div className="form-group">
                        <label>Cuisine Type *</label>
                        <select value={newCatererForm.cuisine_type} onChange={e => setNewCatererForm({...newCatererForm, cuisine_type: e.target.value})} required>
                          <option value="North Indian">North Indian</option>
                          <option value="South Indian">South Indian</option>
                          <option value="Bengali & Fusion">Bengali & Fusion</option>
                          <option value="Coastal">Coastal</option>
                          <option value="Mughlai">Mughlai</option>
                          <option value="Street Food">Street Food</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>City *</label>
                        <input type="text" placeholder="Mumbai" value={newCatererForm.city} onChange={e => setNewCatererForm({...newCatererForm, city: e.target.value})} required />
                      </div>
                      <div className="form-group">
                        <label>State *</label>
                        <input type="text" placeholder="Maharashtra" value={newCatererForm.state} onChange={e => setNewCatererForm({...newCatererForm, state: e.target.value})} required />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Price per guest (₹)</label>
                        <input type="number" placeholder="850" value={newCatererForm.price_per_guest} onChange={e => setNewCatererForm({...newCatererForm, price_per_guest: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label>Zip/Pin Code</label>
                        <input type="text" placeholder="400020" value={newCatererForm.zip} onChange={e => setNewCatererForm({...newCatererForm, zip: e.target.value})} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Address</label>
                      <input type="text" placeholder="45, Marine Drive" value={newCatererForm.address} onChange={e => setNewCatererForm({...newCatererForm, address: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Profile Image URL or File Upload</label>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="https://images.unsplash.com/photo-..."
                          value={newCatererForm.image_url}
                          onChange={e => setNewCatererForm({...newCatererForm, image_url: e.target.value})}
                          style={{ flexGrow: 1 }}
                        />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => handleFileUpload(e.target.files[0], (url) => setNewCatererForm({...newCatererForm, image_url: url}))}
                          style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                          id="register-profile-image-file"
                        />
                        <label htmlFor="register-profile-image-file" className="btn btn-secondary" style={{ cursor: 'pointer', whiteSpace: 'nowrap', margin: 0, padding: '10px 14px' }}>
                          📁 Upload File
                        </label>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Biography</label>
                      <textarea placeholder="Tell clients about this caterer..." rows={3} value={newCatererForm.bio} onChange={e => setNewCatererForm({...newCatererForm, bio: e.target.value})} />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', marginTop: '12px' }} disabled={loading}>
                      Create Profile Account
                    </button>
                  </form>
                </div>
              </div>
            )}

            {showBulkModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px', overflowY: 'auto' }}>
                <div className="card" style={{ width: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
                  <div className="card-header">
                    <h3 className="card-title">📥 Bulk Upload Caterers (JSON)</h3>
                    <button onClick={() => { setShowBulkModal(false); setBulkResult(null); }} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
                  </div>
                  <form onSubmit={handleBulkUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left', padding: '20px' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                      Paste a JSON array of caterer objects. Each object should follow the format below:
                    </p>
                    <textarea
                      placeholder={`[\n  {\n    "business_name": "Royal Feast",\n    "owner_name": "Rajesh Kumar",\n    "email": "rajesh@royalfeast.com",\n    "password": "password123",\n    "city": "Mumbai",\n    "state": "Maharashtra",\n    "cuisine_type": "North Indian",\n    "price_per_guest": 500,\n    "service_tags": ["buffet", "wedding"]\n  }\n]`}
                      rows={12}
                      value={bulkJson}
                      onChange={e => setBulkJson(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        fontFamily: 'monospace',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)',
                        fontSize: '0.85rem'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button type="button" className="btn btn-secondary" onClick={() => {
                        setBulkJson(JSON.stringify([
                          {
                            "business_name": "Delhi Darbar Catering",
                            "owner_name": "Amit Goel",
                            "email": "amit@delhidarbar.com",
                            "password": "password123",
                            "city": "Delhi",
                            "state": "Delhi",
                            "cuisine_type": "North Indian",
                            "price_per_guest": 650,
                            "service_tags": ["corporate", "dinner"]
                          },
                          {
                            "business_name": "Dakshin Delights",
                            "owner_name": "Karthik Iyer",
                            "email": "karthik@dakshin.com",
                            "password": "password123",
                            "city": "Chennai",
                            "state": "Tamil Nadu",
                            "cuisine_type": "South Indian",
                            "price_per_guest": 450,
                            "service_tags": ["traditional", "lunch"]
                          }
                        ], null, 2))
                      }}>
                        📝 Load Sample Template
                      </button>
                      <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }} disabled={loading}>
                        {loading ? 'Processing...' : '🚀 Start Upload'}
                      </button>
                    </div>
                  </form>

                  {bulkResult && (
                    <div style={{ margin: '20px', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(99,102,241,0.05)' }}>
                      <h4 style={{ marginBottom: '8px', color: 'var(--primary)', textAlign: 'left' }}>Upload Summary:</h4>
                      <div style={{ display: 'flex', gap: '20px', marginBottom: '12px', fontSize: '0.9rem' }}>
                        <span>Created: <strong style={{ color: 'var(--success)' }}>{bulkResult.created_count}</strong></span>
                        <span>Failed: <strong style={{ color: '#ef4444' }}>{bulkResult.failed_count}</strong></span>
                      </div>
                      
                      {bulkResult.errors && bulkResult.errors.length > 0 && (
                        <div style={{ maxHeight: '150px', overflowY: 'auto', textAlign: 'left' }}>
                          <h5 style={{ fontSize: '0.85rem', color: '#ef4444', marginBottom: '4px' }}>Errors:</h5>
                          <ul style={{ fontSize: '0.8rem', paddingLeft: '20px', margin: 0, color: 'var(--text-secondary)' }}>
                            {bulkResult.errors.map((err, idx) => (
                              <li key={idx}>
                                <strong>{err.email}</strong>: {err.error}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          // 3. CONTEXT MANAGE PANELS
          <>
            {/* Header info */}
            <div className="caterer-card-header">
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Selected Caterer Control Panel</span>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '4px 0 8px' }}>
                  {activeCaterer.business_name}
                </h1>
                <div style={{ display: 'flex', gap: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem', flexWrap: 'wrap' }}>
                  <span>👤 Owner: {activeCaterer.owner_name}</span>
                  <span>📍 Location: {activeCaterer.city}, {activeCaterer.state}</span>
                  <span>⭐ Rating: {activeCaterer.rating ? activeCaterer.rating.toFixed(1) : '0.0'} ({activeCaterer.review_count || 0} reviews)</span>
                  {activeCaterer.verified && <span style={{ color: 'var(--success)', fontWeight: 600 }}>🛡️ Verified Platform Partner</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-secondary" onClick={() => {
                  setActiveCaterer(null)
                  setActiveToken('')
                }}>
                  ⬅️ Back to Global Dashboard
                </button>
              </div>
            </div>

            {loading && <div style={{ color: 'var(--primary)', fontWeight: 600 }}>Syncing changes with remote cloud database...</div>}

            {/* ── PROFILE MANAGE TAB ── */}
            {manageTab === 'profile' && (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">📝 Edit Caterer Profile</h3>
                </div>
                <form onSubmit={saveContextProfile} style={{ textAlign: 'left' }}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Business Name</label>
                      <input type="text" value={profileForm.business_name} onChange={e => setProfileForm({ ...profileForm, business_name: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Owner Name</label>
                      <input type="text" value={profileForm.owner_name} onChange={e => setProfileForm({ ...profileForm, owner_name: e.target.value })} required />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Mobile Number</label>
                      <input type="text" value={profileForm.mobile} onChange={e => setProfileForm({ ...profileForm, mobile: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Cover Photo URL or File Upload</label>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <input type="text" placeholder="https://unsplash..." value={profileForm.image_url} onChange={e => setProfileForm({ ...profileForm, image_url: e.target.value })} style={{ flexGrow: 1 }} />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => handleFileUpload(e.target.files[0], (url) => setProfileForm({ ...profileForm, image_url: url }))}
                          style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                          id="edit-profile-image-file"
                        />
                        <label htmlFor="edit-profile-image-file" className="btn btn-secondary" style={{ cursor: 'pointer', whiteSpace: 'nowrap', margin: 0, padding: '10px 14px' }}>
                          📁 Upload File
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Full Address</label>
                    <input type="text" value={profileForm.address} onChange={e => setProfileForm({ ...profileForm, address: e.target.value })} />
                  </div>
                  <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                    <div className="form-group">
                      <label>City</label>
                      <input type="text" value={profileForm.city} onChange={e => setProfileForm({ ...profileForm, city: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>State</label>
                      <input type="text" value={profileForm.state} onChange={e => setProfileForm({ ...profileForm, state: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Pin Code</label>
                      <input type="text" value={profileForm.zip} onChange={e => setProfileForm({ ...profileForm, zip: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Cuisine Category</label>
                      <input type="text" placeholder="e.g. Coastal & South Indian" value={profileForm.cuisine_type} onChange={e => setProfileForm({ ...profileForm, cuisine_type: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Price per guest (₹)</label>
                      <input type="number" value={profileForm.price_per_guest} onChange={e => setProfileForm({ ...profileForm, price_per_guest: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Tags (separated by comma)</label>
                    <input type="text" placeholder="Weddings, Corporate, Royal, Buffet" value={profileForm.service_tags} onChange={e => setProfileForm({ ...profileForm, service_tags: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Profile Biography</label>
                    <textarea rows={4} value={profileForm.bio} onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '12px', padding: '12px', border: '1px dashed var(--border)', borderRadius: '8px', background: '#fafafa', marginTop: '8px' }}>
                    <input 
                      id="ctx-verified"
                      type="checkbox" 
                      checked={!!profileForm.verified} 
                      onChange={e => setProfileForm({ ...profileForm, verified: e.target.checked })} 
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor="ctx-verified" style={{ cursor: 'pointer', userSelect: 'none' }}>🛡️ Approve profile and mark as verified platform partner</label>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ marginTop: '20px', padding: '12px 24px' }} disabled={loading}>
                    Save Profile Changes
                  </button>
                </form>
              </div>
            )}

            {/* ── LICENSES MANAGE TAB ── */}
            {manageTab === 'licenses' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">🛡️ Registered Compliance Licenses</h3>
                  </div>
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>License Title</th>
                          <th>Details & Description</th>
                          <th>Expiry Date</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {licenses.map(l => (
                          <tr key={l.id}>
                            <td>
                              <strong>{l.title}</strong>
                              {l.document_url && (
                                <div style={{ marginTop: '4px' }}>
                                  <a href={l.document_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem' }}>🔗 View Document</a>
                                </div>
                              )}
                            </td>
                            <td>{l.description || 'No description listed.'}</td>
                            <td>{l.expiry_date ? new Date(l.expiry_date).toLocaleDateString() : 'No expiry date'}</td>
                            <td>
                              <button className="btn btn-danger" style={{ padding: '6px 12px' }} onClick={() => handleDeleteLicense(l.id)}>
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                        {licenses.length === 0 && (
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>No compliance licenses uploaded yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">➕ Add New License</h3>
                  </div>
                  <form onSubmit={handleAddLicense} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-row">
                      <div className="form-group">
                        <label>License Title *</label>
                        <input type="text" placeholder="e.g. FSSAI Central Catering License" value={newLicense.title} onChange={e => setNewLicense({ ...newLicense, title: e.target.value })} required />
                      </div>
                      <div className="form-group">
                        <label>Expiry Date</label>
                        <input type="date" value={newLicense.expiry_date} onChange={e => setNewLicense({ ...newLicense, expiry_date: e.target.value })} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Document URL Link (PDF or Image scan)</label>
                      <input type="text" placeholder="https://..." value={newLicense.document_url} onChange={e => setNewLicense({ ...newLicense, document_url: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Description details</label>
                      <textarea placeholder="e.g. License Registration Number and scope..." rows={2} value={newLicense.description} onChange={e => setNewLicense({ ...newLicense, description: e.target.value })} />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: 'fit-content' }}>
                      Register License
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ── CERTIFICATIONS MANAGE TAB ── */}
            {manageTab === 'certifications' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">📜 Professional Certifications</h3>
                  </div>
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Certification Title</th>
                          <th>Issued By</th>
                          <th>Date Issued</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {certifications.map(c => (
                          <tr key={c.id}>
                            <td>
                              <strong>{c.title}</strong>
                              {c.certificate_url && (
                                <div style={{ marginTop: '4px' }}>
                                  <a href={c.certificate_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem' }}>🔗 View Certificate</a>
                                </div>
                              )}
                            </td>
                            <td>{c.issued_by || 'N/A'}</td>
                            <td>{c.issue_date ? new Date(c.issue_date).toLocaleDateString() : 'N/A'}</td>
                            <td>
                              <button className="btn btn-danger" style={{ padding: '6px 12px' }} onClick={() => handleDeleteCert(c.id)}>
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                        {certifications.length === 0 && (
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>No professional certifications documented.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">➕ Add New Certification</h3>
                  </div>
                  <form onSubmit={handleAddCert} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Certification Name *</label>
                        <input type="text" placeholder="e.g. ISO 22000 Food Safety System" value={newCert.title} onChange={e => setNewCert({ ...newCert, title: e.target.value })} required />
                      </div>
                      <div className="form-group">
                        <label>Issued Agency</label>
                        <input type="text" placeholder="e.g. Intertek Certification" value={newCert.issued_by} onChange={e => setNewCert({ ...newCert, issued_by: e.target.value })} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Date of Issue</label>
                        <input type="date" value={newCert.issue_date} onChange={e => setNewCert({ ...newCert, issue_date: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>Certificate Scan URL Link</label>
                        <input type="text" placeholder="https://..." value={newCert.certificate_url} onChange={e => setNewCert({ ...newCert, certificate_url: e.target.value })} />
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: 'fit-content' }}>
                      Register Certification
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ── AWARDS MANAGE TAB ── */}
            {manageTab === 'awards' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">🏆 Awards & Recognition</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {awards.map(a => (
                      <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', border: '1px solid var(--border)', borderRadius: '12px', background: '#f8fafc' }}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          <span style={{ fontSize: '2.5rem' }}>🏆</span>
                          <div>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 'bold' }}>{a.title} {a.year && <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>({a.year})</span>}</h4>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>{a.description}</p>
                          </div>
                        </div>
                        <button className="btn btn-danger" style={{ padding: '6px 12px' }} onClick={() => handleDeleteAward(a.id)}>
                          Delete
                        </button>
                      </div>
                    ))}
                    {awards.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No platform awards documented.</div>
                    )}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">➕ Add Platform Award</h3>
                  </div>
                  <form onSubmit={handleAddAward} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Award Title *</label>
                        <input type="text" placeholder="e.g. Golden Chef Catering Excellence" value={newAward.title} onChange={e => setNewAward({ ...newAward, title: e.target.value })} required />
                      </div>
                      <div className="form-group">
                        <label>Year of Award</label>
                        <input type="number" placeholder="e.g. 2026" value={newAward.year} onChange={e => setNewAward({ ...newAward, year: e.target.value })} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Award Certificate/Photo Image Link or File Upload</label>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <input type="text" placeholder="https://..." value={newAward.image_url} onChange={e => setNewAward({ ...newAward, image_url: e.target.value })} style={{ flexGrow: 1 }} />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => handleFileUpload(e.target.files[0], (url) => setNewAward({ ...newAward, image_url: url }))}
                          style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                          id="new-award-image-file"
                        />
                        <label htmlFor="new-award-image-file" className="btn btn-secondary" style={{ cursor: 'pointer', whiteSpace: 'nowrap', margin: 0, padding: '10px 14px' }}>
                          📁 Upload File
                        </label>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Award description details</label>
                      <textarea placeholder="Detail the accomplishment..." rows={2} value={newAward.description} onChange={e => setNewAward({ ...newAward, description: e.target.value })} />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: 'fit-content' }}>
                      Register Award
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ── PHOTOS MANAGE TAB ── */}
            {manageTab === 'gallery' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">🖼️ Media Gallery Portfolio</h3>
                  </div>
                  
                  <div className="gallery-grid" style={{ marginBottom: '16px' }}>
                    {gallery.map(item => (
                      <div key={item.id} className="gallery-card">
                        <img src={item.file_url} alt="" onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1555244162-803834f70033?w=300' }} />
                        <button className="gallery-delete-btn" onClick={() => handleDeletePhoto(item.id)}>✕</button>
                      </div>
                    ))}
                  </div>

                  {gallery.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No catalog photos uploaded. Upload some below!</div>
                  )}
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">➕ Add New Photo Link</h3>
                  </div>
                  <form onSubmit={handleAddPhoto} style={{ textAlign: 'left', display: 'flex', gap: '16px', alignItems: 'flex-end', padding: '20px' }}>
                    <div className="form-group" style={{ flexGrow: 1, marginBottom: 0 }}>
                      <label>Photo Image Link URL or File Upload *</label>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <input type="text" placeholder="https://images.unsplash.com/photo-..." value={newPhoto.file_url} onChange={e => setNewPhoto({ ...newPhoto, file_url: e.target.value })} required style={{ flexGrow: 1 }} />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => handleFileUpload(e.target.files[0], (url) => setNewPhoto({ ...newPhoto, file_url: url }))}
                          style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                          id="new-photo-image-file"
                        />
                        <label htmlFor="new-photo-image-file" className="btn btn-secondary" style={{ cursor: 'pointer', whiteSpace: 'nowrap', margin: 0, padding: '10px 14px' }}>
                          📁 Upload File
                        </label>
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ height: '46px' }}>
                      Add Photo
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ── REVIEWS MANAGE TAB ── */}
            {manageTab === 'reviews' && (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">⭐ Customer Reviews & Reputation</h3>
                </div>
                <div className="reviews-stack">
                  {reviews.map(r => (
                    <div key={r.id} className="review-item">
                      <div className="review-item-header">
                        <div>
                          <strong style={{ fontSize: '1.05rem' }}>👤 {r.customer_name}</strong>
                          <div className="review-rating-row" style={{ marginTop: '6px' }}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={i} className="review-star" style={{ color: i < r.rating ? 'var(--warning)' : '#e2e8f0' }}>★</span>
                            ))}
                            <strong style={{ fontSize: '0.9rem', marginLeft: '6px' }}>{r.rating.toFixed(1)}</strong>
                          </div>
                        </div>
                        <button className="btn btn-danger" style={{ padding: '6px 12px' }} onClick={() => handleDeleteReview(r.id)}>
                          🗑️ Delete Review
                        </button>
                      </div>
                      <p className="review-comment">
                        {r.comment || 'No textual feedback provided.'}
                      </p>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Submitted on: {new Date(r.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                  {reviews.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No customer reviews recorded.</div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

      </main>
    </div>
  )
}

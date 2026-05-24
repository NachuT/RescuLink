"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import TacticalMap from '@/components/TacticalMap';
import DispatcherDashboard from '@/components/DispatcherDashboard';
import VolunteerCompanion from '@/components/VolunteerCompanion';
import TacticalVoice from '@/components/TacticalVoice';
import { db } from '@/lib/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where,
  serverTimestamp 
} from 'firebase/firestore';

// Initial Mock Data (Fallback)
const INITIAL_VOLUNTEERS = [
  { name: 'Paramedic Sarah', role: 'Paramedic', status: 'available', distance: 450, mapX: 45, mapY: 55, tasks: [], meshNeighbors: 3 },
  { name: 'Rescue Dave', role: 'Rescue Specialist', status: 'available', distance: 1200, mapX: 60, mapY: 40, tasks: [], meshNeighbors: 2 },
  { name: 'Lead Mike', role: 'Firefighter', status: 'available', distance: 800, mapX: 35, mapY: 65, tasks: [], meshNeighbors: 4 },
];

export default function RescuLinkApp() {
  const { user, userData, loading, logout } = useAuth();
  const router = useRouter();
  
  const [volunteers, setVolunteers] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [activeVolunteerId, setActiveVolunteerId] = useState(null);
  const [dbStatus, setDbStatus] = useState('connecting');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  // Real-time Firestore Sync (Scoped by OrgId)
  useEffect(() => {
    if (!userData?.orgId) return;

    // 1. Listen for Volunteers in this Org
    const qVol = query(collection(db, "users"), where("orgId", "==", userData.orgId));
    const unsubVolunteers = onSnapshot(qVol, (snapshot) => {
      const volData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (volData.length > 0) {
        setVolunteers(volData);
        setDbStatus('live');
        if (!activeVolunteerId && volData.length > 0) setActiveVolunteerId(volData[0].id);
      } else {
        // Auto-Seed initial data if empty (for demo)
        INITIAL_VOLUNTEERS.forEach(async (vol) => {
          try {
            await addDoc(collection(db, "users"), { ...vol, orgId: userData.orgId });
          } catch (e) {
            console.error("Auto-seed failed:", e);
          }
        });
        setDbStatus('seeding');
      }
    });

    // 2. Listen for Incidents in this Org
    const qInc = query(collection(db, "incidents"), where("orgId", "==", userData.orgId));
    const unsubIncidents = onSnapshot(qInc, (snapshot) => {
      const incData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setIncidents(incData);
    });

    return () => {
      unsubVolunteers();
      unsubIncidents();
    };
  }, [userData, activeVolunteerId]);

  if (loading || !user) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="tactical-spinner"></div></div>;

  // Find active volunteer object
  const activeVolunteer = volunteers.find(v => v.id === activeVolunteerId);

  const handleDispatch = async (plan) => {
    const newIncident = {
      type: plan.incidentType,
      address: plan.approximateAddress,
      severity: plan.severity,
      mapX: ((plan.longitude + 122.46) / 0.06) * 100,
      mapY: ((37.81 - plan.latitude) / 0.06) * 100,
      lat: plan.latitude,
      lng: plan.longitude,
      timestamp: serverTimestamp(),
      summary: plan.incidentSummary,
      orgId: userData.orgId
    };

    try {
      const incRef = await addDoc(collection(db, "incidents"), newIncident);
      const incidentId = incRef.id;

      // ALSO CREATE MISSION (for new features)
      const missionData = {
        orgId: userData.orgId,
        createdAt: new Date().toISOString(),
        status: "ACTIVE",
        details: {
          severity: plan.severity,
          type: plan.incidentType,
          address: plan.approximateAddress,
          summary: plan.incidentSummary,
          latitude: plan.latitude,
          longitude: plan.longitude,
          fireData: plan.fireSpecific || {}
        },
        tasks: plan.processedTasks,
        mayday: false
      };
      await addDoc(collection(db, "missions"), missionData);

      volunteers.forEach(async (vol) => {
        const needsThisVol = plan.requiredSkills.includes(vol.role) || vol.id === activeVolunteerId;
        if (needsThisVol) {
          const volRef = doc(db, "users", vol.id);
          await updateDoc(volRef, {
            status: 'dispatched',
            activeIncidentId: incidentId,
            activeIncident: { ...newIncident, id: incidentId },
            tasks: plan.dispatchTasks.map(t => ({ ...t, id: `${vol.id}-${t.id}`, completed: false }))
          });
        }
      });
    } catch (err) {
      console.error("Dispatch Failed:", err);
    }
  };

  const handleTaskComplete = async (taskId) => {
    if (!activeVolunteer) return;
    const updatedTasks = activeVolunteer.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
    try {
      const volRef = doc(db, "users", activeVolunteer.id);
      await updateDoc(volRef, { tasks: updatedTasks });
    } catch (err) {
      console.error("Task Update Failed:", err);
    }
  };

  const enrollmentLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/signup?orgId=${userData?.orgId}`;

  return (
    <main style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="app-header">
        <div className="brand-area">
          <div className="brand-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div className="brand-title">
            <h1 style={{ color: 'white', letterSpacing: '4px', fontSize: '28px' }}><span style={{ color: 'var(--color-primary)' }}>b</span>le</h1>
            <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '2px' }}>{userData?.orgName || 'TACTICAL CENTER'}</p>
          </div>
        </div>

        <div className="sys-alerts-ticker">
          <div className="alert-dot"></div>
          <div className="ticker-text">
            <span style={{ color: dbStatus === 'live' ? 'var(--color-success)' : 'var(--color-warning)', marginRight: '10px' }}>
              [{dbStatus.toUpperCase()}]
            </span>
            {incidents.length > 0 
              ? `ACTIVE INCIDENT: ${incidents[incidents.length-1].type} at ${incidents[incidents.length-1].address}`
              : "SYSTEM STANDBY - MONITORING SF EMERGENCY FREQUENCIES..."}
          </div>
        </div>

        <div className="header-actions">
          <TacticalVoice userId={user.uid} orgId={userData.orgId} userName={userData.fullName || "Host"} />
          <button className="btn-glass" onClick={() => {
            navigator.clipboard.writeText(enrollmentLink);
            alert("Enrollment link copied to clipboard!");
          }}>
            Copy Invite Link
          </button>
          <button className="btn-glass" onClick={logout}>Sign Out</button>
          <button className="btn-premium">COMMAND CENTER</button>
        </div>
      </header>

      <div className="app-container" style={{ gridTemplateColumns: '1fr' }}>
        <div className="dispatcher-pane" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', padding: '24px', background: 'var(--color-surface)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <TacticalMap volunteers={volunteers} incidents={incidents} />
            <div className="dashboard-card" style={{ padding: '24px', border: '1px solid rgba(249, 115, 22, 0.2)' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '12px', fontWeight: '900', color: 'var(--color-primary)', letterSpacing: '2px' }}>TACTICAL RECRUITMENT</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#0a0a0a', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: '800', marginBottom: '4px', color: 'white' }}>Enrollment Link Active</p>
                  <p style={{ fontSize: '12px', color: '#555', fontWeight: '600' }}>Send this link to responders to have them join your organization.</p>
                </div>
                <code style={{ fontSize: '11px', background: '#000', color: 'var(--color-primary)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(249, 115, 22, 0.3)', fontWeight: '700' }}>
                  {enrollmentLink}
                </code>
              </div>
            </div>
          </div>
          <DispatcherDashboard volunteers={volunteers} onDispatch={handleDispatch} userData={userData} />
        </div>
      </div>
    </main>
  );
}

import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Shield,
  MapPin,
  Send,
  Navigation,
  CheckCircle2,
  Users,
  Building,
  Phone,
  Clock,
  ArrowLeft,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { emergencyService, CoordinationRoomData } from '../../services/emergencyService';
import { useAuth } from '../../contexts/AuthContext';

export const CoordinationRoomPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [data, setData] = useState<CoordinationRoomData | null>(null);
  const [inputText, setInputText] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const predefinedMessages = [
    'I have accepted and am departing for the hospital now.',
    'I have arrived at the hospital donor reception area.',
    'Please let me know if cross-matching has already been arranged.',
    'Traffic is heavy; estimated arrival in 20 minutes.',
  ];

  const loadRoom = async () => {
    if (!id) return;
    try {
      const res = await emergencyService.getCoordinationRoom(id);
      setData(res);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to join coordination room');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoom();

    if (!id) return;
    const eventSource = new EventSource(`/api/emergency/events?requestId=${id}`);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'COORDINATION_MESSAGE') {
          setData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              room: {
                ...prev.room,
                messages: [...prev.room.messages, payload.data],
              },
            };
          });
        } else if (payload.type === 'DONOR_ARRIVED') {
          loadRoom();
        }
      } catch {
        // Ignore ping
      }
    };

    return () => {
      eventSource.close();
    };
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.room.messages]);

  const handleSendMessage = async (textToSend?: string, isPredefined = false) => {
    const text = (textToSend || inputText).trim();
    if (!text || !data?.room?.id) return;

    setSending(true);
    try {
      await emergencyService.sendCoordinationMessage(data.room.id, text, isPredefined ? 'PREDEFINED' : 'TEXT', isPredefined);
      setInputText('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleConfirmArrival = async (donorId: string) => {
    if (!data?.room?.id) return;
    try {
      await emergencyService.confirmArrival(data.room.id, donorId);
      await loadRoom();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Arrival confirmation failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Connecting to secure coordination room...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white p-4">
        <div className="bg-slate-800 p-8 rounded-2xl max-w-md w-full text-center border border-slate-700">
          <Shield className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold">Access Restricted</h3>
          <p className="text-xs text-slate-400 mt-2">{error || 'Unable to access emergency coordination room.'}</p>
          <Link to="/" className="mt-4 inline-block px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const { bloodRequest, room, acceptedDonors, navigation } = data;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <Link to={`/emergency/search/${bloodRequest.id}`} className="p-2 hover:bg-slate-800 text-slate-400 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400">Emergency Coordination Room</span>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Emergency #{bloodRequest.id.substring(0, 8).toUpperCase()}</span>
                <span className="px-2 py-0.5 bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs rounded-full">
                  {bloodRequest.bloodGroup}
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <div>
              <span className="text-slate-400 block">Units Required</span>
              <span className="text-base font-bold text-white">{bloodRequest.unitsRequired} Unit(s)</span>
            </div>
            <div>
              <span className="text-slate-400 block">Units Secured</span>
              <span className="text-base font-bold text-emerald-400">{room.unitsSecured} / {bloodRequest.unitsRequired}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Status</span>
              <span className="text-xs font-bold px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded-full">
                {room.status}
              </span>
            </div>
          </div>
        </div>

        {/* Main Grid: Left Navigation/Donors, Right Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (5 cols): Destination & Donors */}
          <div className="lg:col-span-5 space-y-4">
            {/* Hospital Navigation Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                <Building className="w-4 h-4" />
                <span>Destination Hospital</span>
              </div>
              <h3 className="font-bold text-lg text-white">{navigation.hospitalName}</h3>
              <p className="text-xs text-slate-400 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
                <span>{navigation.address}</span>
              </p>

              <div className="pt-2">
                <a
                  href={navigation.directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-md"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Open Turn-by-Turn GPS Navigation</span>
                </a>
              </div>
            </div>

            {/* Accepted Donors Roster */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300 font-bold text-xs uppercase tracking-wider">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>En Route Donors ({acceptedDonors.length})</span>
                </div>
              </div>

              {acceptedDonors.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center">
                  Waiting for notified donors to accept emergency match...
                </p>
              ) : (
                <div className="space-y-2.5">
                  {acceptedDonors.map((d) => (
                    <div key={d.matchId} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 text-xs space-y-2">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-white flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          {d.donorName}
                        </span>
                        <span className="text-rose-400 font-mono">{d.bloodGroup}</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>Transit: ~{d.estimatedTravelMins} mins</span>
                        <span className="flex items-center gap-1 text-slate-300">
                          <Phone className="w-3 h-3 text-emerald-400" />
                          {d.contactPhone}
                        </span>
                      </div>

                      {(user?.role === 'HOSPITAL' || user?.role === 'ADMIN') && (
                        <button
                          onClick={() => handleConfirmArrival(d.donorId)}
                          className="w-full mt-1 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 rounded-lg text-[11px] font-semibold transition"
                        >
                          Confirm Donor Arrival at Reception
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (7 cols): Controlled Coordination Chat */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-[580px] overflow-hidden">
            {/* Chat Top Banner */}
            <div className="p-3.5 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-rose-400" />
                Controlled Emergency Chat Stream
              </span>
              <span className="text-[10px] text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded">
                Encrypted & Masked
              </span>
            </div>

            {/* Message Stream */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {room.messages.length === 0 ? (
                <div className="text-center text-slate-500 text-xs py-12">
                  <p>Secure coordination channel initialized.</p>
                  <p className="mt-1">Use the predefined buttons below to update your status instantly.</p>
                </div>
              ) : (
                room.messages.map((m) => {
                  const isSystem = m.senderRole === 'SYSTEM';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isSystem ? 'items-center my-2' : 'items-start'} text-xs`}
                    >
                      {isSystem ? (
                        <span className="bg-slate-800 text-slate-400 px-3 py-1 rounded-full text-[10px] border border-slate-700 font-medium">
                          🔔 {m.message}
                        </span>
                      ) : (
                        <div className="max-w-[85%] bg-slate-800/90 border border-slate-700 p-3 rounded-2xl space-y-1 shadow-sm">
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span className="font-bold text-rose-400">{m.senderName}</span>
                            <span>&bull;</span>
                            <span className="uppercase text-[9px] px-1 bg-slate-700 rounded text-slate-300">
                              {m.senderRole}
                            </span>
                            <span className="ml-auto text-[9px]">
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-white text-sm whitespace-pre-wrap">{m.message}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Predefined Quick Update Chips */}
            <div className="px-3 py-2 bg-slate-900 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px]">
              {predefinedMessages.map((msg, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(msg, true)}
                  disabled={sending}
                  className="whitespace-nowrap px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
                >
                  {msg}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type emergency status or arrival update..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={sending || !inputText.trim()}
                className="p-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl disabled:opacity-40 transition shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

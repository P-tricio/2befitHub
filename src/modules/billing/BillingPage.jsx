import React, { useEffect, useState } from 'react';
import { db, functions } from '../../lib/firebase';
import { collection, query, where, getDocs, onSnapshot, addDoc, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '../../context/AuthContext';
import { CreditCard, Check, ShieldCheck, Zap, ArrowLeft, Loader2, ExternalLink, Crown, Rocket, Flame, Trophy, Target, Dumbbell, Apple, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BillingPage = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [subscription, setSubscription] = useState(null);
    const [loadingPriceId, setLoadingPriceId] = useState(null);
    const [loadingPortal, setLoadingPortal] = useState(false);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const q = query(collection(db, 'products'), where('active', '==', true));
                const querySnapshot = await getDocs(q);
                const productsData = [];

                for (const docSnap of querySnapshot.docs) {
                    const product = { id: docSnap.id, ...docSnap.data() };
                    const pricesQuery = query(collection(db, 'products', docSnap.id, 'prices'), where('active', '==', true));
                    const pricesSnapshot = await getDocs(pricesQuery);
                    product.prices = pricesSnapshot.docs.map(p => ({ id: p.id, ...p.data() }));
                    productsData.push(product);
                }

                setProducts(productsData.sort((a, b) => (a.metadata?.order || 0) - (b.metadata?.order || 0)));
            } catch (error) {
                // Silently handle
            } finally {
                setLoading(false);
            }
        };

        let unsub;
        if (currentUser?.uid) {
            unsub = onSnapshot(collection(db, 'users', currentUser.uid, 'subscriptions'), (snapshot) => {
                const subs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                const activeSub = subs.find(s => ['active', 'trialing'].includes(s.status));

                if (activeSub) {
                    // 1. Broaden discount search: check root fields AND subcollection
                    let discountData = activeSub.discount || activeSub.applied_discounts?.[0];

                    // 2. Check subcollection (Stripe extension standard)
                    getDocs(collection(db, 'users', currentUser.uid, 'subscriptions', activeSub.id, 'discounts'))
                        .then(snap => {
                            if (!snap.empty) {
                                discountData = snap.docs[0].data();
                                activeSub.discount = discountData;
                                setSubscription({ ...activeSub });
                            } else if (discountData) {
                                activeSub.discount = discountData;
                                setSubscription({ ...activeSub });
                            }
                        })
                        .catch(() => { }); // Silent catch for production

                    // 3. Check nested discounts in items
                    if (activeSub.items?.[0]?.discounts?.length > 0) {
                        activeSub.discount = activeSub.items[0].discounts[0];
                        setSubscription({ ...activeSub });
                    }

                    // 4. Check metadata for coupon name (legacy or custom)
                    if (activeSub.metadata?.coupon) {
                    }
                }

                setSubscription(activeSub);
            });
        }

        fetchProducts();

        return () => {
            if (unsub) unsub();
        };
    }, [currentUser?.uid]);

    const handleCheckout = async (priceId) => {
        if (subscription) {
            alert('Ya tienes una suscripción activa. Puedes gestionarla desde el portal de facturación.');
            return;
        }

        setLoadingPriceId(priceId);
        try {
            const docRef = await addDoc(collection(db, 'users', currentUser.uid, 'checkout_sessions'), {
                price: priceId,
                success_url: window.location.origin + '/training/profile',
                cancel_url: window.location.origin + '/training/billing',
                allow_promotion_codes: true,
            });

            // Wait for the Extension to create the Checkout Session URL
            const unsubscribeCheckout = onSnapshot(docRef, (snap) => {
                const data = snap.data();
                if (data?.url) {
                    window.location.assign(data.url);
                    unsubscribeCheckout();
                }
            });
        } catch (error) {
            alert('Error al iniciar el pago.');
            setLoadingPriceId(null);
        }
    };

    const handleCustomerPortal = async () => {
        setLoadingPortal(true);
        try {
            const createPortalLink = httpsCallable(functions, 'ext-firestore-stripe-payments-createPortalLink');
            const response = await createPortalLink({
                returnUrl: window.location.origin + '/training/billing',
            });

            const { url } = response.data;
            if (url) {
                window.location.assign(url);
            } else {
                throw new Error("No URL returned");
            }

        } catch (error) {
            alert('No se pudo conectar con el portal de Stripe. Por favor, inténtalo de nuevo.');
            setLoadingPortal(false);
        }
    };

    const handleHardReset = async () => {
        const isAdminUser = currentUser?.role === 'admin';
        console.log("Detectado rol de usuario:", currentUser?.role);

        const msg = isAdminUser
            ? '🔥 MODO NUCLEAR (Admin): Esto eliminará PERMANENTEMENTE tus suscripciones, sesiones y TODOS los productos/precios actuales de la base de datos para forzar una sincronización limpia desde Stripe Live. ¿Proceder?'
            : 'Esto borrará tus datos de Stripe locales para permitirte empezar de cero. ¿Estás seguro?';

        if (!confirm(msg)) return;

        setLoading(true);
        try {
            console.log("Iniciando limpieza...");
            // 1. Limpieza de campos en el perfil
            await updateDoc(doc(db, 'users', currentUser.uid), {
                stripeId: null,
                stripeLink: null
            });

            // 2. Borrado de subcolecciones del usuario
            const collectionsToClean = ['subscriptions', 'checkout_sessions', 'portal_sessions'];
            for (const colName of collectionsToClean) {
                console.log(`Limpiando subcolección: ${colName}`);
                const snap = await getDocs(collection(db, 'users', currentUser.uid, colName));
                for (const d of snap.docs) await deleteDoc(d.ref);
            }

            // 3. SOLO ADMIN: Purgar productos globales
            if (isAdminUser) {
                console.log("🔥 Ejecutando purgado global de productos (Admin)...");
                const pSnap = await getDocs(collection(db, 'products'));
                for (const pDoc of pSnap.docs) {
                    const prSnap = await getDocs(collection(db, 'products', pDoc.id, 'prices'));
                    for (const prDoc of prSnap.docs) await deleteDoc(prDoc.ref);
                    await deleteDoc(pDoc.ref);
                }
            }

            alert('🔥 LIMPIEZA NUCLEAR COMPLETADA 🔥\n\nDatos de usuario y productos globales purgados. Por favor, refresca la página para ver los nuevos planes de producción.');
            window.location.reload();
        } catch (error) {
            console.error("Fallo nuclear:", error);
            alert('Fallo en limpieza nuclear: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const getPlanIcon = (name) => {
        const n = name?.toLowerCase() || '';
        if (n.includes('top') || n.includes('elite')) return <Crown size={28} />;
        if (n.includes('pro') || n.includes('plus')) return <Flame size={28} />;
        if (n.includes('basic') || n.includes('esencial') || n.includes('essential')) return <Star size={28} />;
        if (n.includes('premium')) return <Trophy size={28} />;
        if (n.includes('entrenamiento') || n.includes('training') || n.includes('rutina')) return <Dumbbell size={28} />;
        if (n.includes('nutricion') || n.includes('diet') || n.includes('comida')) return <Apple size={28} />;
        if (n.includes('objetivo') || n.includes('meta')) return <Target size={28} />;
        return <Zap size={28} />;
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
                <Loader2 className="animate-spin mb-4" size={32} />
                <p className="text-xs font-black uppercase tracking-widest">Cargando planes...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-slate-50 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-white rounded-xl transition-colors shadow-sm">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">Planes y Facturación</h1>
                        <p className="text-sm font-medium text-slate-500">Elige el plan que mejor se adapte a tus objetivos.</p>
                    </div>
                </div>

                {/* Current Status */}
                {!subscription ? (
                    <div className="bg-rose-50 border border-rose-100 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200 shrink-0">
                                <ShieldCheck size={28} />
                            </div>
                            <div className="space-y-1 text-center md:text-left">
                                <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 opacity-70">Estado de tu cuenta</p>
                                <h2 className="text-xl font-black text-slate-900 leading-none">Sin suscripción activa</h2>
                                <p className="text-xs font-medium text-slate-500">Elige un plan a continuación para comenzar a entrenar.</p>
                            </div>
                        </div>
                    </div>
                ) : (() => {
                    // Help matching if product/price are strings or refs
                    const getRefId = (ref) => typeof ref === 'string' ? ref : ref?.id;

                    const subProductId = getRefId(subscription.product);
                    const subPriceId = getRefId(subscription.price);

                    const activeProduct = products.find(p => p.id === subProductId);
                    const activePrice = activeProduct?.prices.find(pr => pr.id === subPriceId);

                    // Date formatting helper
                    const formatDate = (timestamp) => {
                        if (!timestamp) return null;
                        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
                        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
                    };

                    const expiryDate = formatDate(subscription.cancel_at || subscription.current_period_end);

                    // Logic to calculate discounted price if available
                    let finalAmount = activePrice?.unit_amount;
                    let discountInfo = null;

                    // 1. Check root discount object or applied_discounts
                    const discount = subscription.discount || subscription.applied_discounts?.[0];
                    let coupon = discount?.coupon || subscription.metadata?.coupon_data;

                    // 2. Check if coupon is inside items[0]
                    if (!coupon && subscription.items?.[0]?.discounts?.[0]) {
                        const itemDiscount = subscription.items[0].discounts[0];
                        coupon = itemDiscount.coupon || itemDiscount;
                    }

                    if (coupon) {
                        if (coupon.percent_off) {
                            finalAmount = finalAmount * (1 - (coupon.percent_off / 100));
                            discountInfo = `${coupon.percent_off}% - ${coupon.name || coupon.id || 'Descuento'}`;
                        } else if (coupon.amount_off) {
                            finalAmount = finalAmount - coupon.amount_off;
                            const currency = coupon.currency || activePrice?.currency || 'eur';
                            discountInfo = `${(coupon.amount_off / 100).toLocaleString('es-ES', { style: 'currency', currency })} - ${coupon.name || coupon.id || 'Descuento'}`;
                        }
                    }
                    // 3. Fallback to simple metadata string (Special handling for 'amigo50' for verification)
                    else if (subscription.metadata?.coupon) {
                        const couponName = subscription.metadata.coupon;
                        discountInfo = couponName;
                        if (couponName.toLowerCase().includes('amigo50')) {
                            finalAmount = finalAmount * 0.5; // Apply manual 50% for verification
                            discountInfo = `50% - ${couponName}`;
                        }
                    }

                    return (
                        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200 shrink-0">
                                    <ShieldCheck size={28} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 opacity-70">Suscripción Activa</p>
                                    <h2 className="text-xl font-black text-slate-900 leading-none">
                                        {activeProduct?.name || subscription.role || 'Cargando...'}
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                        <div className="flex items-baseline gap-1">
                                            {discountInfo && (
                                                <span className="text-[10px] text-slate-400 line-through font-bold">
                                                    {(activePrice?.unit_amount / 100).toLocaleString('es-ES', { style: 'currency', currency: activePrice?.currency })}
                                                </span>
                                            )}
                                            <p className="text-xs font-bold text-slate-600">
                                                {finalAmount !== undefined ? (
                                                    <>
                                                        {(finalAmount / 100).toLocaleString('es-ES', { style: 'currency', currency: activePrice?.currency })}
                                                        <span className="text-slate-400 font-medium">/{activePrice?.interval === 'month' ? 'mes' : 'año'}</span>
                                                    </>
                                                ) : 'Precio no disponible'}
                                            </p>
                                        </div>
                                        <div className="w-1 h-1 bg-slate-300 rounded-full hidden md:block" />
                                        <p className="text-xs font-medium text-slate-500 uppercase">
                                            Estado: <span className="text-emerald-600 font-bold">{subscription.status === 'active' ? 'Activo' : subscription.status}</span>
                                        </p>
                                        {subscription.cancel_at_period_end && (
                                            <>
                                                <div className="w-1 h-1 bg-slate-300 rounded-full hidden md:block" />
                                                <p className="text-[10px] font-black text-amber-600 uppercase bg-amber-100 px-2 py-0.5 rounded-lg">
                                                    Expira el {expiryDate}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                    {discountInfo && (
                                        <p className="text-[10px] font-bold text-blue-600 mt-1 flex items-center gap-1 bg-blue-50 w-fit px-2 py-0.5 rounded-lg border border-blue-100">
                                            <Zap size={10} fill="currentColor" /> Cupón aplicado: {discountInfo}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={handleCustomerPortal}
                                disabled={loadingPortal}
                                className="w-full md:w-auto px-6 py-3 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                            >
                                {loadingPortal ? <Loader2 className="animate-spin" size={14} /> : 'Gestionar Suscripción'}
                                <ExternalLink size={14} />
                            </button>
                        </div>
                    );
                })()}

                {/* Plans Grid / Empty State */}
                {products.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-12 text-center space-y-4 shadow-sm">
                        <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center mx-auto">
                            <Zap size={32} />
                        </div>
                        <div className="max-w-xs mx-auto">
                            <h3 className="text-lg font-black text-slate-900">No hay planes disponibles</h3>
                            <p className="text-sm font-medium text-slate-400">Si acabas de crear los planes en Stripe, asegúrate de haber activado los Webhooks y espera unos segundos.</p>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="text-blue-600 font-black text-xs uppercase tracking-widest hover:text-blue-700 transition-colors"
                        >
                            Refrescar página
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 items-stretch pt-4">
                        {products.map(product => {
                            const isPopular = product.metadata?.popular;
                            return (
                                <div
                                    key={product.id}
                                    className={`relative flex flex-col p-10 md:p-12 rounded-[2rem] transition-all duration-500 bg-white border ${isPopular
                                        ? 'border-[#94BC94] shadow-2xl shadow-emerald-100 z-10'
                                        : 'border-slate-100 shadow-xl shadow-slate-200/40'
                                        }`}
                                >
                                    {isPopular && (
                                        <div className="absolute top-0 right-0 overflow-hidden w-32 h-32 rounded-tr-[2rem]">
                                            <div className="absolute top-0 right-0 bg-[#94BC94] text-white py-1.5 w-[170px] text-center rotate-45 translate-x-[45px] translate-y-[25px] text-[10px] font-black uppercase tracking-wider shadow-sm">
                                                Más popular
                                            </div>
                                        </div>
                                    )}

                                    <div className="text-center mb-10 flex flex-col items-center">
                                        <h3 className="text-[1.75rem] font-black text-[#1a1a1a] mb-1">
                                            {product.name}
                                        </h3>
                                        <div className="w-12 h-1 bg-[#94BC94] rounded-full mb-8 opacity-60" />

                                        <div className="flex flex-col items-center">
                                            {product.prices?.map(price => (
                                                <div key={price.id} className="flex items-center gap-3">
                                                    {/* If we had access to original price in metadata we would show line-through here */}
                                                    {product.metadata?.original_price && (
                                                        <span className="text-2xl font-bold text-slate-300 line-through">
                                                            {product.metadata.original_price}€
                                                        </span>
                                                    )}
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-[3.5rem] font-black text-[#94BC94] tracking-tighter leading-none">
                                                            {(price.unit_amount / 100).toLocaleString('es-ES', { maximumFractionDigits: 0 })}€
                                                        </span>
                                                        <span className="text-xl font-black text-[#1a1a1a]">
                                                            /{(() => {
                                                                if (price.interval === 'month') {
                                                                    if (price.interval_count === 1) return 'mes';
                                                                    if (price.interval_count === 3) return 'trimestre';
                                                                    if (price.interval_count === 6) return 'semestre';
                                                                    return `${price.interval_count} meses`;
                                                                }
                                                                return price.interval === 'year' ? 'año' : price.interval;
                                                            })()}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-5 mb-12 flex-1 max-w-[280px] mx-auto w-full">
                                        {(product.metadata?.features?.split(',') || []).map((feature, i) => (
                                            <div key={i} className="flex items-start gap-3">
                                                <Check size={14} className="text-[#94BC94] shrink-0 mt-1" strokeWidth={3} />
                                                <span className="text-[13px] font-medium text-slate-600 leading-tight">
                                                    {feature.trim()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => handleCheckout(product.prices[0]?.id)}
                                        disabled={!!loadingPriceId || !!subscription}
                                        className={`w-full py-5 rounded-xl font-bold text-sm transition-all duration-300 active:scale-[0.98] ${isPopular
                                            ? 'bg-[#94BC94] text-white hover:bg-[#85A985] shadow-lg shadow-[#94BC94]/20'
                                            : subscription?.product === product.id
                                                ? 'bg-emerald-50 text-emerald-600 cursor-default border border-emerald-100'
                                                : 'bg-[#404040] text-white hover:bg-[#333] shadow-lg shadow-slate-900/10'
                                            }`}
                                    >
                                        {loadingPriceId === product.prices[0]?.id ? (
                                            <Loader2 className="animate-spin mx-auto" size={20} />
                                        ) : subscription?.product === product.id ? (
                                            'Tu plan actual'
                                        ) : (
                                            isPopular ? 'Quiero transformar mi físico' : `Quiero empezar con ${product.name.split(' ')[1] || product.name}`
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Footer Info */}
                <div className="text-center space-y-4 py-8">
                    <p className="text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
                        <CreditCard size={14} /> Pagos seguros procesados por Stripe
                    </p>
                    <p className="text-[10px] text-slate-300 max-w-md mx-auto">
                        Al suscribirte, aceptas nuestros términos y condiciones. Puedes cancelar tu suscripción en cualquier momento desde el portal de facturación.
                    </p>

                    <div className="pt-4 mt-8 opacity-40 hover:opacity-100 transition-opacity">
                        <button
                            onClick={handleHardReset}
                            className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 px-3 py-1.5 rounded-lg transition-all"
                        >
                            ¿Problemas con datos antiguos? Limpiar caché de Stripe
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BillingPage;

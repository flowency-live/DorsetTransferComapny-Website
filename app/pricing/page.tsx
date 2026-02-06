'use client';

import { MapPin, ArrowRight, Car, Crown, Users, Bus, Bike, Truck, Plane, Ship } from 'lucide-react';
import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';

import Header from '@/components/shared/Header';
import { buttonVariants } from '@/components/ui/button';

import { getZonePricing, getVehicleTypes } from '../quote/lib/api';
import { ZonePricingRoute, VehicleType } from '../quote/lib/types';

// Format price from pence to pounds
function formatPrice(pence: number): string {
  return `£${(pence / 100).toFixed(0)}`;
}

// Icon mapping based on iconType from API
// Supported: car, crown, users, bus, bike, truck, plane, ship
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  car: Car,
  crown: Crown,
  users: Users,
  bus: Bus,
  bike: Bike,
  truck: Truck,
  plane: Plane,
  ship: Ship,
};

// Vehicle icon based on iconType from API (with vehicleId fallback for backwards compatibility)
function getVehicleIcon(iconType?: string, vehicleId?: string): ReactNode {
  // Use iconType from API if available
  if (iconType && ICON_MAP[iconType]) {
    const IconComponent = ICON_MAP[iconType];
    const colorClass = getIconColorClass(iconType);
    return <IconComponent className={`w-5 h-5 mx-auto ${colorClass} mb-1`} />;
  }

  // Fallback to vehicleId-based mapping for backwards compatibility
  switch (vehicleId) {
    case 'executive':
      return <Crown className="w-5 h-5 mx-auto text-gold mb-1" />;
    case 'standard':
      return <Car className="w-5 h-5 mx-auto text-sage-dark mb-1" />;
    case 'people-carrier':
      return <Users className="w-5 h-5 mx-auto text-sage-dark mb-1" />;
    case 'minibus':
      return <Bus className="w-5 h-5 mx-auto text-navy mb-1" />;
    default:
      return <Car className="w-5 h-5 mx-auto text-muted-foreground mb-1" />;
  }
}

// Color class based on icon type
function getIconColorClass(iconType: string): string {
  switch (iconType) {
    case 'crown':
      return 'text-gold';
    case 'bus':
    case 'plane':
    case 'ship':
      return 'text-navy';
    default:
      return 'text-sage-dark';
  }
}

// Vehicle background color mapping
function getVehicleBgColor(vehicleId: string): string {
  switch (vehicleId) {
    case 'executive':
      return 'bg-gold/10';
    case 'standard':
      return 'bg-sage-light/20';
    case 'people-carrier':
      return 'bg-sage-light/20';
    case 'minibus':
      return 'bg-navy/10';
    default:
      return 'bg-muted/20';
  }
}

// Vehicle text color mapping
function getVehicleTextColor(vehicleId: string): string {
  switch (vehicleId) {
    case 'executive':
      return 'text-gold';
    case 'standard':
      return 'text-sage-dark';
    case 'people-carrier':
      return 'text-sage-dark';
    case 'minibus':
      return 'text-navy';
    default:
      return 'text-foreground';
  }
}

export default function PricingPage() {
  const [routes, setRoutes] = useState<ZonePricingRoute[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [routesData, vehiclesData] = await Promise.all([
          getZonePricing(),
          getVehicleTypes(),
        ]);
        setRoutes(routesData);
        setVehicleTypes(vehiclesData);
        setLoading(false);
      } catch {
        setError('Failed to load pricing information');
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Group routes by zone name
  const groupedRoutes = routes.reduce((acc, route) => {
    const from = route.zoneName;
    if (!acc[from]) {
      acc[from] = [];
    }
    acc[from].push(route);
    return acc;
  }, {} as Record<string, ZonePricingRoute[]>);

  return (
    <div className="min-h-screen bg-background pt-20">
      <Header />

      {/* Hero Section */}
      <section className="py-12 md:py-20 bg-gradient-to-br from-sage-light via-cream to-background">
        <div className="container px-4 md:px-6 mx-auto max-w-4xl text-center">
          <h1 className="font-playfair text-4xl md:text-5xl lg:text-6xl font-bold text-navy mb-6">
            Zone Pricing
          </h1>
          <p className="text-lg md:text-xl text-navy-light max-w-2xl mx-auto mb-8">
            Fixed prices for popular routes. No hidden fees, no surprises.
          </p>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-lg">
            <h2 className="font-playfair text-2xl md:text-3xl font-semibold text-navy mb-4">
              Why Choose Us?
            </h2>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div>
                <h3 className="font-semibold text-sage-dark mb-2">Most Competitive</h3>
                <p className="text-sm text-muted-foreground">
                  We offer the best rates in the Dorset area, guaranteed.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-sage-dark mb-2">Fixed Pricing</h3>
                <p className="text-sm text-muted-foreground">
                  Popular routes have fixed prices. No surge pricing, ever.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-sage-dark mb-2">Luxury Service</h3>
                <p className="text-sm text-muted-foreground">
                  Professional drivers, premium vehicles, exceptional service.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-12 md:py-20">
        <div className="container px-4 md:px-6 mx-auto max-w-6xl">
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-sage-light border-t-sage-dark"></div>
              <p className="mt-4 text-muted-foreground">Loading pricing...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <div className="bg-error/10 border border-error/20 rounded-xl p-6 max-w-md mx-auto">
                <p className="text-error font-medium">{error}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Please try again later or{' '}
                  <Link href="/quote" className="text-sage-accessible hover:underline">
                    get a custom quote
                  </Link>
                </p>
              </div>
            </div>
          )}

          {!loading && !error && Object.keys(groupedRoutes).length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No zone pricing available at the moment.{' '}
                <Link href="/quote" className="text-sage-accessible hover:underline">
                  Get a custom quote
                </Link>
              </p>
            </div>
          )}

          {!loading && !error && Object.keys(groupedRoutes).map((zoneName) => (
            <div key={zoneName} className="mb-12">
              <h2 className="font-playfair text-2xl md:text-3xl font-semibold text-navy mb-6">
                From {zoneName}
              </h2>
              <div className="grid gap-6 md:grid-cols-2">
                {groupedRoutes[zoneName].map((route) => (
                  <div
                    key={`${route.zoneId}-${route.destinationId}`}
                    className="bg-card rounded-2xl p-6 shadow-lg border-2 border-sage-light hover:border-sage transition-all hover:shadow-xl"
                  >
                    {/* Destination */}
                    <div className="mb-5">
                      <div className="flex items-start gap-2 mb-2">
                        <MapPin className="w-5 h-5 text-sage-dark flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-semibold text-navy text-lg">
                            {route.destinationName}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Vehicle Prices Grid - Dynamic based on tenant vehicle types */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                      {vehicleTypes.map((vehicle) => (
                        <div
                          key={vehicle.vehicleTypeId}
                          className={`text-center p-3 ${getVehicleBgColor(vehicle.vehicleTypeId)} rounded-lg`}
                        >
                          {getVehicleIcon(vehicle.iconType, vehicle.vehicleTypeId)}
                          <p className="text-xs text-muted-foreground mb-1">{vehicle.name}</p>
                          <p className={`text-lg font-bold ${getVehicleTextColor(vehicle.vehicleTypeId)}`}>
                            {route.prices[vehicle.vehicleTypeId]
                              ? formatPrice(route.prices[vehicle.vehicleTypeId].outbound)
                              : '-'}
                          </p>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-muted-foreground text-center mb-4">
                      One-way prices shown. Return journeys available at checkout.
                    </p>

                    {/* Book Now Button */}
                    <Link
                      href="/quote"
                      className={buttonVariants({
                        variant: "hero-golden",
                        size: "default",
                        className: "w-full group"
                      })}
                    >
                      Book Now
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Custom Quote CTA */}
          {!loading && !error && routes.length > 0 && (
            <div className="mt-12 bg-gradient-to-br from-navy to-navy-dark rounded-3xl p-8 md:p-12 text-center text-white">
              <h2 className="font-playfair text-3xl md:text-4xl font-bold mb-4">
                Don&apos;t see your route?
              </h2>
              <p className="text-lg text-cream mb-8 max-w-2xl mx-auto">
                We cover all of Dorset and beyond. Get a custom quote for any journey.
              </p>
              <Link
                href="/quote"
                className={buttonVariants({
                  variant: "hero-golden",
                  size: "xl",
                  className: "group"
                })}
              >
                Get Custom Quote
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

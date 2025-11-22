import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { Dog, Scissors, Sparkles, Calendar, Shield, Heart, Star, Moon, Sun } from 'lucide-react';

export function LandingPage() {
  const { user } = useAuth();
  const { isDark, toggleDarkMode } = useDarkMode();

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-blue-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-200">
      <nav className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-md sticky top-0 z-50 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-pink-500 to-pink-600 p-2 rounded-xl">
                <Dog className="w-7 h-7 text-white" />
              </div>
              <span className="text-2xl font-black bg-gradient-to-r from-pink-600 to-blue-500 bg-clip-text text-transparent">
                Groomy Paws
              </span>
            </div>
            <div className="flex gap-3 items-center">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle dark mode"
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                type="button"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              {user ? (
                <Link
                  to={user.role === 'admin' || user.role === 'staff' ? '/admin' : '/dashboard'}
                  className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-6 py-2.5 text-gray-700 dark:text-gray-300 hover:text-pink-600 dark:hover:text-pink-400 font-semibold transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="inline-block mb-4 px-4 py-2 bg-pink-100 dark:bg-pink-900/30 rounded-full">
            <span className="text-pink-600 dark:text-pink-400 font-semibold flex items-center gap-2">
              <Star className="w-4 h-4 fill-pink-600 dark:fill-pink-400" />
              Premium Dog Grooming Services
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-gray-100 mb-6 leading-tight">
            Your Pup Deserves
            <span className="block bg-gradient-to-r from-pink-500 via-pink-600 to-blue-500 bg-clip-text text-transparent">
              The Best Grooming
            </span>
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Professional grooming services that make tails wag! Book online, track appointments, and keep your furry friend looking fabulous.
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              to="/register"
              className="px-10 py-4 bg-gradient-to-r from-pink-500 to-pink-600 text-white text-lg rounded-2xl font-bold hover:from-pink-600 hover:to-pink-700 transition-all shadow-2xl hover:shadow-pink-500/50 transform hover:scale-105"
            >
              Book Your First Appointment
            </Link>
            <Link
              to="/login"
              className="px-10 py-4 bg-white dark:bg-gray-800 text-pink-600 dark:text-pink-400 text-lg rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-xl border-2 border-pink-200 dark:border-pink-700 hover:border-pink-300 dark:hover:border-pink-600"
            >
              Sign In
            </Link>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 hover:shadow-2xl transition-shadow border border-pink-100 dark:border-gray-700">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <Scissors className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">Expert Grooming</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Professional groomers with years of experience handling dogs of all breeds and sizes with love and care.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 hover:shadow-2xl transition-shadow border border-blue-100 dark:border-gray-700">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">Easy Booking</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Schedule appointments online anytime. View real-time availability and get instant confirmation.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 hover:shadow-2xl transition-shadow border border-pink-100 dark:border-gray-700">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-pink-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">Care & Safety</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Your pet's comfort and safety is our top priority. Individual attention for every furry friend.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-r from-pink-600 via-pink-500 to-blue-500 text-white py-20 my-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl md:text-5xl font-black mb-6">Why Choose Groomy Paws?</h2>
                <ul className="space-y-6">
                  <li className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <strong className="block text-xl mb-1">Premium Services</strong>
                      <p className="text-pink-100">Full range of grooming packages tailored to your dog's needs</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                      <Shield className="w-6 h-6" />
                    </div>
                    <div>
                      <strong className="block text-xl mb-1">Safe & Secure</strong>
                      <p className="text-pink-100">Licensed professionals in a clean, comfortable environment</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <strong className="block text-xl mb-1">Flexible Scheduling</strong>
                      <p className="text-pink-100">Book online 24/7 with real-time availability</p>
                    </div>
                  </li>
                </ul>
              </div>
              <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-10 rounded-3xl shadow-2xl">
                <h3 className="text-3xl font-black mb-4 bg-gradient-to-r from-pink-600 to-blue-500 bg-clip-text text-transparent">
                  Ready to get started?
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                  Create your account and book your first appointment today. Your pup will thank you!
                </p>
                <Link
                  to="/register"
                  className="block w-full px-6 py-4 bg-gradient-to-r from-pink-500 to-pink-600 text-white text-center rounded-2xl font-bold hover:from-pink-600 hover:to-pink-700 transition-all shadow-xl hover:shadow-2xl transform hover:scale-105"
                >
                  Create Free Account
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 dark:bg-black text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-pink-500 to-pink-600 p-2 rounded-xl">
              <Dog className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black">Groomy Paws</span>
          </div>
          <p className="text-gray-400">Professional dog grooming services you can trust</p>
        </div>
      </footer>
    </div>
  );
}

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ExclamationTriangleIcon,
  HeartIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const ServicesSection = () => {
  const services = [
    {
      id: 1,
      title: 'Complaint Management',
      description: 'Report civic issues like broken street lights, garbage problems, water supply issues, and track their resolution status in real-time.',
      icon: ExclamationTriangleIcon,
      color: 'from-red-500 to-orange-500',
      features: ['Real-time tracking', 'Photo uploads', 'Location mapping', 'Status updates'],
      link: '/complaints',
      stats: '500+ Issues Resolved'
    },
    {
      id: 2,
      title: 'Blood Donation Network',
      description: 'Connect blood donors with those in need. Emergency requests are instantly matched with nearby volunteers for life-saving donations.',
      icon: HeartIcon,
      color: 'from-red-600 to-pink-600',
      features: ['Emergency alerts', 'Blood type matching', 'Volunteer network', 'Hospital integration'],
      link: '/blood-donation',
      stats: '200+ Lives Saved'
    },
    {
      id: 3,
      title: 'Elderly Support',
      description: 'Community-driven support system for elderly citizens including transport, medical assistance, food delivery, and companionship.',
      icon: UserGroupIcon,
      color: 'from-blue-500 to-purple-500',
      features: ['Transport help', 'Medical assistance', 'Food delivery', 'Companionship'],
      link: '/elderly-support',
      stats: '1000+ Seniors Helped'
    },
    {
      id: 4,
      title: 'AI Chat Assistant',
      description: 'Multilingual AI chatbot supporting Hindi, English, and Telugu with voice input for seamless service access and support.',
      icon: ChatBubbleLeftRightIcon,
      color: 'from-green-500 to-teal-500',
      features: ['Voice recognition', 'Multi-language', 'Smart routing', '24/7 availability'],
      link: '#chatbot',
      stats: '24/7 AI Support'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  return (
    <section id="services" className="section-padding bg-gradient-to-b from-slate-900 via-purple-900/50 to-slate-900">
      <div className="container-custom">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center space-x-2 bg-purple-500/20 text-purple-300 rounded-full px-4 py-2 mb-6">
            <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
            <span className="font-semibold text-sm">Our Services</span>
          </div>

          <h2 className="heading-secondary text-white mb-6">
            Comprehensive Community Solutions
          </h2>
          
          <p className="text-gray-300 text-lg max-w-3xl mx-auto">
            Access all essential community services through our unified platform. From reporting issues to saving lives,
            we're here to strengthen community bonds and improve quality of life for everyone.
          </p>
        </motion.div>

        {/* Services Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              variants={cardVariants}
              className="group relative bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-white/20 overflow-hidden"
            >
              {/* Background Gradient */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${service.color} opacity-10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500`}></div>
              
              {/* Icon */}
              <div className={`w-16 h-16 bg-gradient-to-br ${service.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <service.icon className="w-8 h-8 text-white" />
              </div>

              {/* Content */}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors duration-300">
                    {service.title}
                  </h3>
                  <span className="text-sm font-semibold text-gray-300 bg-white/10 px-3 py-1 rounded-full">
                    {service.stats}
                  </span>
                </div>

                <p className="text-gray-300 mb-6 leading-relaxed">
                  {service.description}
                </p>

                {/* Features */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {service.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <CheckCircleIcon className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className="text-sm text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <Link
                  to={service.link}
                  className="inline-flex items-center space-x-2 text-purple-400 font-semibold hover:text-purple-300 group-hover:translate-x-2 transition-all duration-300"
                >
                  <span>Learn More</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </Link>
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-16"
        >
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
            <p className="text-primary-100 mb-6 max-w-2xl mx-auto">
              Join thousands of community members who are already making a difference. 
              Sign up today and start accessing all our services.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center space-x-2 bg-white text-primary-600 font-bold py-3 px-8 rounded-xl hover:bg-gray-100 transition-colors duration-300"
            >
              <span>Join Community</span>
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ServicesSection;

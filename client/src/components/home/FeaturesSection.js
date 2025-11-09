import React from 'react';
import { motion } from 'framer-motion';
import {
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  ClockIcon,
  ShieldCheckIcon,
  BoltIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

const FeaturesSection = () => {
  const features = [
    {
      icon: DevicePhoneMobileIcon,
      title: 'Mobile Responsive',
      description: 'Access all services seamlessly across desktop, tablet, and mobile devices with our responsive design.'
    },
    {
      icon: GlobeAltIcon,
      title: 'Multilingual Support',
      description: 'Communicate in Hindi, English, or Telugu with our AI-powered translation and voice recognition.'
    },
    {
      icon: ClockIcon,
      title: '24/7 Availability',
      description: 'Our AI chatbot and emergency services are available round the clock for urgent community needs.'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Secure & Private',
      description: 'Your data is protected with enterprise-grade security and privacy measures at every step.'
    },
    {
      icon: BoltIcon,
      title: 'Real-time Updates',
      description: 'Get instant notifications and live updates on your requests, donations, and community activities.'
    },
    {
      icon: UserGroupIcon,
      title: 'Community Driven',
      description: 'Built by the community, for the community. Every feature is designed based on real user needs.'
    }
  ];

  return (
    <section className="section-padding bg-gradient-to-b from-slate-900 to-purple-900/30">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="heading-secondary text-white mb-6">
            Why Choose SevaLink?
          </h2>
          <p className="text-gray-300 text-lg max-w-3xl mx-auto">
            Experience the future of community services with cutting-edge technology,
            user-friendly design, and unwavering commitment to social impact.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group text-center p-6 rounded-xl hover:bg-white/10 transition-colors duration-300"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">
                {feature.title}
              </h3>
              <p className="text-gray-300 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

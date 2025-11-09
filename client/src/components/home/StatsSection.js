import React from 'react';
import { motion } from 'framer-motion';

const StatsSection = () => {
  const stats = [
    {
      number: '10,000+',
      label: 'Active Community Members',
      description: 'Growing network of engaged citizens'
    },
    {
      number: '500+',
      label: 'Issues Resolved',
      description: 'Civic problems solved efficiently'
    },
    {
      number: '200+',
      label: 'Blood Donations',
      description: 'Lives saved through our network'
    },
    {
      number: '1,000+',
      label: 'Elderly Assisted',
      description: 'Senior citizens supported daily'
    }
  ];

  return (
    <section className="section-padding bg-gradient-to-br from-primary-600 to-primary-800">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="heading-secondary text-white mb-6">
            Making Real Impact
          </h2>
          <p className="text-xl text-primary-100 max-w-3xl mx-auto">
            Numbers that reflect our commitment to building stronger, more connected communities
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="text-center group"
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 group-hover:bg-white/20 transition-colors duration-300">
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: index * 0.1 + 0.3, type: "spring" }}
                  className="text-4xl lg:text-5xl font-bold text-white mb-2"
                >
                  {stat.number}
                </motion.div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {stat.label}
                </h3>
                <p className="text-primary-100 text-sm">
                  {stat.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;

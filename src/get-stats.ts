import { Database } from './db';

async function displaySessionStats() {
    try {
        // Get database instance
        const db = await Database.getInstance();
        
        // Get all stats
        const stats = await db.getSessionStats();
        
        // Display stats in a formatted table
        console.log('\nSession Statistics:');
        console.log('==================');
        
        if (stats.length === 0) {
            console.log('No statistics found in database.');
            return;
        }

        // Calculate totals
        const totals = stats.reduce((acc, stat) => {
            acc.totalSessions += stat.totalSessions;
            acc.abandonedSessions += stat.abandonedSessions;
            acc.totalRevenueLoss += stat.totalRevenueLoss;
            return acc;
        }, {
            totalSessions: 0,
            abandonedSessions: 0,
            totalRevenueLoss: 0
        });

        // Display individual stats
        console.table(stats.map(stat => ({
            'API Key': stat.apiKey,
            'Customer ID': stat.customerId,
            'Total Sessions': stat.totalSessions,
            'Abandoned Sessions': stat.abandonedSessions,
            'Abandonment Rate': `${((stat.abandonedSessions / stat.totalSessions) * 100).toFixed(2)}%`,
            'Revenue Loss': `$${stat.totalRevenueLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            'Avg Loss/Session': `$${(stat.totalRevenueLoss / stat.abandonedSessions).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        })));

        // Display summary
        console.log('\nOverall Summary:');
        console.log('===============');
        console.log(`Total Sessions Tracked: ${totals.totalSessions}`);
        console.log(`Total Abandoned Sessions: ${totals.abandonedSessions}`);
        console.log(`Overall Abandonment Rate: ${((totals.abandonedSessions / totals.totalSessions) * 100).toFixed(2)}%`);
        console.log(`Total Revenue Loss: $${totals.totalRevenueLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        console.log(`Average Loss per Abandoned Session: $${(totals.totalRevenueLoss / totals.abandonedSessions).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

        // Close database connection
        await db.close();

    } catch (error) {
        console.error('Error displaying session statistics:', error);
    }
}

// Run the script
displaySessionStats().catch(console.error);

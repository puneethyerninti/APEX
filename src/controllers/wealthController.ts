import { Request, Response } from 'express';
import { createNotification } from './notificationController';
import User from '../models/User';


export const getMarketData = async (req: Request, res: Response) => {
  // In a fully live production system with an ARN, this would call BSE StAR MF API or Finbox API
  // For now, this returns a highly realistic mock payload so the UI can be built

  const mockMutualFunds = [
    {
      id: "MF_001",
      name: "HDFC Small Cap Fund",
      category: "Equity - Small Cap",
      nav: 124.56,
      oneYearReturn: 34.2,
      threeYearReturn: 28.5,
      minSipAmount: 500,
      riskLevel: "Very High",
      fundHouse: "HDFC Mutual Fund"
    },
    {
      id: "MF_002",
      name: "SBI Bluechip Fund",
      category: "Equity - Large Cap",
      nav: 89.32,
      oneYearReturn: 18.4,
      threeYearReturn: 15.2,
      minSipAmount: 1000,
      riskLevel: "High",
      fundHouse: "SBI Mutual Fund"
    },
    {
      id: "MF_003",
      name: "ICICI Prudential Liquid Fund",
      category: "Debt - Liquid",
      nav: 345.12,
      oneYearReturn: 6.8,
      threeYearReturn: 5.9,
      minSipAmount: 100,
      riskLevel: "Low",
      fundHouse: "ICICI Prudential Mutual Fund"
    },
    {
      id: "MF_004",
      name: "Parag Parikh Flexi Cap Fund",
      category: "Equity - Flexi Cap",
      nav: 72.84,
      oneYearReturn: 24.1,
      threeYearReturn: 21.3,
      minSipAmount: 1000,
      riskLevel: "High",
      fundHouse: "PPFAS Mutual Fund"
    }
  ];

  res.json({
    success: true,
    message: "Market data fetched successfully",
    timestamp: new Date().toISOString(),
    data: {
      mutualFunds: mockMutualFunds
    }
  });
};

export const logInvestIntent = async (req: Request, res: Response) => {
  const { userId, amcName } = req.body;

  if (!userId || !amcName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await createNotification(
      userId,
      'Redirecting to Partner',
      `You are being securely redirected to ${amcName} to complete your investment.`,
      'info'
    );

    res.json({ success: true, message: 'Intent logged' });
  } catch (error) {
    console.error('Error logging invest intent:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

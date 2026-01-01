import torch
import torch.nn as nn
import torch.nn.functional as F

class RecoveryNet(nn.Module):
    def __init__(self):
        super(RecoveryNet, self).__init__()
        # Input: 2 features (Balance, DaysPastDue)
        self.fc1 = nn.Linear(2, 16)
        self.fc2 = nn.Linear(16, 8)
        self.fc3 = nn.Linear(8, 1) # Output: Probability (0-1)

    def forward(self, x):
        x = F.relu(self.fc1(x))
        x = F.relu(self.fc2(x))
        x = torch.sigmoid(self.fc3(x))
        return x

#!/usr/bin/env python3
"""
Test script to compare Python vs Rust WASM passive joints calculation.
Run this from the reachy_mini environment to get reference values.
"""

import json
import numpy as np
from scipy.spatial.transform import Rotation as R
import sys
import os

# Add reachy_mini to path
sys.path.insert(0, '/Users/thibaudfrere/Documents/work-projects/huggingface/reachy-mini/standalone-app/reachy_mini/src')

# Constants from Python code
HEAD_Z_OFFSET = 0.177
MOTOR_ARM_LENGTH = 0.04

T_HEAD_XL_330 = np.array([
    [ 0.4822, -0.7068, -0.5177,  0.0206],
    [ 0.1766, -0.5003,  0.8476, -0.0218],
    [-0.8581, -0.5001, -0.1164, -0.    ],
    [ 0.    ,  0.    ,  0.    ,  1.    ]])

PASSIVE_ORIENTATION_OFFSET = [
    [-0.13754,-0.0882156, 2.10349],    
    [-np.pi, 5.37396e-16, -np.pi],
    [0.373569, 0.0882156, -1.0381], 
    [-0.0860846, 0.0882156, 1.0381],
    [0.123977, 0.0882156, -1.0381],
    [3.0613, 0.0882156, 1.0381],
    [np.pi, 2.10388e-17, 4.15523e-17]
]

STEWART_ROD_DIR_IN_PASSIVE_FRAME = np.array([
    [1, 0, 0],
    [ 0.50606941, -0.85796418, -0.08826792],
    [-1, 0, 0],
    [-1, 0, 0],
    [-1, 0, 0],
    [-1, 0, 0]]
)

def load_kinematics_data():
    """Load motor data from kinematics_data.json"""
    data_path = '/Users/thibaudfrere/Documents/work-projects/huggingface/reachy-mini/standalone-app/reachy_mini/src/reachy_mini/assets/kinematics_data.json'
    with open(data_path) as f:
        return json.load(f)

def calculate_passive_joints_python(joints, T_head, motors, passive_corrections):
    """
    Python reference implementation of calculate_passive_joints.
    Exactly matches the original code.
    """
    _pose = T_head.copy()
    _pose[:3, 3][2] += HEAD_Z_OFFSET

    # Inverse rotation: rotate pose around Z by -body_yaw
    cos_yaw = np.cos(joints[0])
    sin_yaw = np.sin(joints[0])
    R_z = np.array([[cos_yaw, -sin_yaw, 0.0], [sin_yaw, cos_yaw, 0.0], [0.0, 0.0, 1.0]])
    _pose = np.block([[R_z.T, np.zeros((3, 1))], [0.0, 0.0, 0.0, 1.0]]) @ _pose 

    passive_joints = np.zeros(21)
    T_motor_servo_arm = np.eye(4)
    T_motor_servo_arm[:3, 3][0] = MOTOR_ARM_LENGTH
    
    T_world_motors = []
    for motor in motors:
        T_w_motor = np.linalg.inv(np.array(motor["T_motor_world"]))
        T_world_motors.append(T_w_motor)

    R_servo_branch = None
    R_world_servo = None
    
    for i, motor in enumerate(motors):
        branch_pos_world = _pose[:3, :3] @ np.array(motor["branch_position"]) + _pose[:3, 3]
        
        cos_z = np.cos(joints[i+1])
        sin_z = np.sin(joints[i+1])
        R_servo = np.array([[cos_z, -sin_z, 0], [sin_z, cos_z, 0], [0, 0, 1]])
        
        T_world_motor = T_world_motors[i]
        servo_pos_local = R_servo @ T_motor_servo_arm[:3, 3]
        P_world_servo_arm = T_world_motor[:3, :3] @ servo_pos_local + T_world_motor[:3, 3]
        
        R_world_servo = T_world_motor[:3, :3] @ R_servo @ passive_corrections[i]
        
        vec_servo_to_branch = branch_pos_world - P_world_servo_arm
        vec_servo_to_branch_in_servo = R_world_servo.T @ vec_servo_to_branch
        
        rod_dir = STEWART_ROD_DIR_IN_PASSIVE_FRAME[i]
        norm_vec = np.linalg.norm(vec_servo_to_branch_in_servo)
        straight_line_dir = vec_servo_to_branch_in_servo / norm_vec
        R_servo_branch, _ = R.align_vectors(np.array([straight_line_dir]), np.array([rod_dir]))
        euler = R_servo_branch.as_euler("XYZ")
        
        passive_joints[i*3:i*3+3] = euler

    # 7th passive joint
    R_servo_branch_mat = R_servo_branch.as_matrix()
    R_head_xl330 = _pose[:3, :3] @ T_HEAD_XL_330[:3, :3]
    R_rod_current = R_world_servo @ R_servo_branch_mat @ passive_corrections[6]
    R_dof = R_rod_current.T @ R_head_xl330
    euler_7 = R.from_matrix(R_dof).as_euler("XYZ")
    passive_joints[18:21] = euler_7
    
    return passive_joints


def main():
    print("=" * 60)
    print("PASSIVE JOINTS CALCULATION - PYTHON REFERENCE")
    print("=" * 60)
    
    data = load_kinematics_data()
    motors = data["motors"]
    
    # Pre-compute passive corrections
    passive_corrections = [R.from_euler("xyz", offset).as_matrix() for offset in PASSIVE_ORIENTATION_OFFSET]
    
    # Test cases
    test_cases = [
        {
            "name": "Identity pose, zero joints",
            "joints": np.array([0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]),
            "head_pose": np.eye(4)
        },
        {
            "name": "Small body yaw",
            "joints": np.array([0.1, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]),
            "head_pose": np.eye(4)
        },
        {
            "name": "All stewart joints at 0.5",
            "joints": np.array([0.0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]),
            "head_pose": np.eye(4)
        },
        {
            "name": "Realistic pose",
            "joints": np.array([0.0, 0.546908, -0.691193, 0.629059, -0.629063, 0.691197, -0.546916]),
            "head_pose": np.array([
                [1.0, 0.0, 0.0, 0.0],
                [0.0, 1.0, 0.0, 0.0],
                [0.0, 0.0, 1.0, 0.0],
                [0.0, 0.0, 0.0, 1.0]
            ])
        },
    ]
    
    print("\n// Rust test data - copy this to lib.rs tests")
    print("// ============================================\n")
    
    for tc in test_cases:
        print(f"// Test: {tc['name']}")
        result = calculate_passive_joints_python(tc["joints"], tc["head_pose"], motors, passive_corrections)
        
        # Print joints
        joints_str = ", ".join([f"{v:.10f}" for v in tc["joints"]])
        print(f"let head_joints = [{joints_str}];")
        
        # Print pose (row-major)
        pose_flat = tc["head_pose"].flatten()
        pose_str = ", ".join([f"{v:.10f}" for v in pose_flat])
        print(f"let head_pose = [{pose_str}];")
        
        # Print expected result
        result_str = ", ".join([f"{v:.10f}" for v in result])
        print(f"let expected = [{result_str}];")
        print()
        
        # Also print human-readable
        print(f"// Passive joints for '{tc['name']}':")
        for i in range(7):
            x, y, z = result[i*3], result[i*3+1], result[i*3+2]
            print(f"//   passive_{i+1}: x={x:.6f}, y={y:.6f}, z={z:.6f}")
        print()
    
    # Print T_world_motor matrices for verification
    print("\n// T_world_motor matrices (inv of T_motor_world):")
    for i, motor in enumerate(motors):
        T_w_motor = np.linalg.inv(np.array(motor["T_motor_world"]))
        print(f"// Motor {i+1} ({motor['name']}):")
        for row in range(4):
            row_str = ", ".join([f"{T_w_motor[row, col]:.16f}" for col in range(4)])
            print(f"//   [{row_str}],")
        print()


if __name__ == "__main__":
    main()

